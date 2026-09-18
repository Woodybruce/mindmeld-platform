import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { getUncachableStripeClient, getStripePublishableKey } from "../../stripeClient";
import { requireAdmin } from "../../middleware/admin";
import { callAI, fetchUserContext } from "../../lib/ai";
import { verifyImageUrl, findRealProductImage } from "../../lib/images";
import { normalizeShopCategory } from "../../lib/shop";
import { LUXURY_INTIMACY_PRODUCTS } from "../../shopProducts";

// Legacy shop routes: curated catalogue + Stripe product/checkout
// management. Moved verbatim from server/routes.ts (Task 10).

export function registerShopRoutes(app: Express): void {
  let shopProductsCache: any[] | null = null;
  let shopCacheTime = 0;
  const SHOP_CACHE_TTL = 1000 * 60 * 120;

  app.get("/api/shop/curated", async (_req: Request, res: Response) => {
    try {
      if (shopProductsCache && Date.now() - shopCacheTime < SHOP_CACHE_TTL) {
        return res.json({ products: shopProductsCache });
      }

      const stripe = await getUncachableStripeClient();
      const stripeProducts = await stripe.products.list({ active: true, limit: 100, expand: ['data.default_price'] });

      const stripeMap = new Map<string, { priceId: string; productId: string; unitAmount: number; currency: string; images: string[] }>();
      for (const sp of stripeProducts.data) {
        const shopName = sp.metadata?.shop_product_name?.toLowerCase()?.trim();
        if (!shopName) continue;

        let priceId = '';
        let unitAmount = 0;
        let currency = 'gbp';

        if (sp.default_price && typeof sp.default_price === 'object') {
          priceId = sp.default_price.id;
          unitAmount = (sp.default_price as any).unit_amount || 0;
          currency = (sp.default_price as any).currency || 'gbp';
        } else {
          const prices = await stripe.prices.list({ product: sp.id, active: true, limit: 5 });
          const gbpPrice = prices.data.find(p => p.currency === 'gbp') || prices.data[0];
          if (gbpPrice) {
            priceId = gbpPrice.id;
            unitAmount = gbpPrice.unit_amount || 0;
            currency = gbpPrice.currency;
          }
        }

        if (priceId) {
          stripeMap.set(shopName, {
            priceId,
            productId: sp.id,
            unitAmount,
            currency,
            images: sp.images || [],
          });
        }
      }

      const matchedNames = new Set<string>();
      const products: any[] = [];

      for (let i = 0; i < LUXURY_INTIMACY_PRODUCTS.length; i++) {
        const lp: any = LUXURY_INTIMACY_PRODUCTS[i];
        const stripeMatch = stripeMap.get(lp.name.toLowerCase().trim());
        if (!stripeMatch) continue;
        matchedNames.add(lp.name.toLowerCase().trim());
        const imageUrl = lp.imageUrl || (stripeMatch.images?.[0]) || null;
        const price = new Intl.NumberFormat("en-GB", { style: "currency", currency: stripeMatch.currency.toUpperCase() }).format(stripeMatch.unitAmount / 100);
        const allImages = (lp.images?.length > 0 ? lp.images : [imageUrl]).filter(Boolean);
        products.push({
          id: `curated-${i}`,
          name: lp.name,
          brand: lp.brand,
          price,
          description: lp.description,
          longDescription: lp.longDescription || lp.description,
          features: lp.features || [`By ${lp.brand}`, "Premium quality", "Perfect for couples"],
          category: normalizeShopCategory(lp.category),
          imageKeyword: lp.imageKeyword || `${lp.category} luxury couples`,
          imageUrl,
          images: allImages,
          source: lp.brand,
          stripePriceId: stripeMatch.priceId,
          stripeProductId: stripeMatch.productId,
          sizing: lp.sizing || null,
          materials: lp.materials || null,
          dimensions: lp.dimensions || null,
          whatsIncluded: lp.whatsIncluded || null,
          careInstructions: lp.careInstructions || null,
        });
      }

      for (const sp of stripeProducts.data) {
        const shopName = sp.metadata?.shop_product_name?.toLowerCase()?.trim();
        if (!shopName || matchedNames.has(shopName)) continue;
        const meta = sp.metadata || {};
        const stripeMatch = stripeMap.get(shopName);
        if (!stripeMatch) continue;

        const imageUrl = sp.images?.[0] || null;
        const price = new Intl.NumberFormat("en-GB", { style: "currency", currency: stripeMatch.currency.toUpperCase() }).format(stripeMatch.unitAmount / 100);
        let features: string[] = [];
        try { features = JSON.parse(meta.features || "[]"); } catch { features = [`By ${meta.brand || "Us"}`, "Premium quality", "Perfect for couples"]; }
        let sizing = null;
        try { sizing = JSON.parse(meta.sizing || "null"); } catch {}
        let whatsIncluded = null;
        try { whatsIncluded = JSON.parse(meta.whats_included || "null"); } catch {}

        products.push({
          id: `ai-${sp.id}`,
          name: meta.shop_product_name || sp.name,
          brand: meta.brand || "",
          price,
          description: sp.description || "",
          longDescription: meta.long_description || sp.description || "",
          features,
          category: normalizeShopCategory(meta.category || "Gifts"),
          imageKeyword: `${meta.category || "luxury"} couples product`,
          imageUrl,
          images: sp.images?.length ? sp.images : (imageUrl ? [imageUrl] : []),
          source: meta.brand || "",
          stripePriceId: stripeMatch.priceId,
          stripeProductId: stripeMatch.productId,
          sizing,
          materials: meta.materials || null,
          dimensions: null,
          whatsIncluded,
          careInstructions: null,
        });
      }

      shopProductsCache = products;
      shopCacheTime = Date.now();
      res.json({ products });
    } catch (e: any) {
      console.error("shop/curated error:", e);
      if (shopProductsCache) {
        return res.json({ products: shopProductsCache });
      }
      res.json({ products: [] });
    }
  });

  app.get("/api/stripe/publishable-key", async (_req: Request, res: Response) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (e: any) {
      console.error("Stripe publishable key error:", e.message);
      res.status(500).json({ error: "Failed to get Stripe key" });
    }
  });

  app.get("/api/stripe/products", async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(
        sql`SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          p.images as product_images,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.active as price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY p.name, pr.unit_amount`
      );

      const productsMap = new Map();
      for (const row of result.rows) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            images: row.product_images,
            prices: [],
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            active: row.price_active,
          });
        }
      }

      res.json({ products: Array.from(productsMap.values()) });
    } catch (e: any) {
      console.error("Stripe products error:", e.message);
      res.status(500).json({ error: "Failed to list products" });
    }
  });

  app.post("/api/stripe/checkout", async (req: Request, res: Response) => {
    try {
      const { priceId, productName, quantity = 1 } = req.body;
      if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
        return res.status(400).json({ error: "Valid priceId is required" });
      }
      const safeQuantity = Math.max(1, Math.min(10, Number(quantity) || 1));
      const safeName = typeof productName === "string" ? productName.slice(0, 200) : "";

      const stripe = await getUncachableStripeClient();
      const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
      if (domains.length === 0) {
        return res.status(500).json({ error: "Server configuration error" });
      }
      const baseUrl = `https://${domains[0]}`;

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: safeQuantity }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout/cancel`,
        metadata: {
          productName: safeName,
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (e: any) {
      console.error("Stripe checkout error:", e.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/stripe/session/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      res.json({
        status: session.payment_status,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total,
        currency: session.currency,
        productName: session.metadata?.productName,
      });
    } catch (e: any) {
      console.error("Stripe session error:", e.message);
      res.status(500).json({ error: "Failed to retrieve session" });
    }
  });

  app.post("/api/stripe/ai-create-products", async (req: Request, res: Response) => {
    try {
      const adminUserId = await requireAdmin(req, res);
      if (!adminUserId) return;

      const { prompt, count = 3, usePersonalisation = true } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "A prompt describing your products is required" });
      }
      const safeCount = Math.max(1, Math.min(10, Number(count) || 3));

      let coupleContext = "";
      if (usePersonalisation) {
        const fullContext = await fetchUserContext(adminUserId);
        coupleContext = fullContext
          .replace(/Recent messages:.*?(?=\n[A-Z]|\n$|$)/s, "")
          .replace(/\n{2,}/g, "\n")
          .trim();
      }

      const personalisationBlock = coupleContext
        ? `\n\nIMPORTANT — COUPLE CONTEXT (use this to tailor product recommendations):
${coupleContext}
Use their interests, moods, liked content, recent conversations and list themes to pick products they would genuinely love. If they discuss date nights, recommend date night products. If they like wellness, lean into spa/self-care. If intimacy is a theme, suggest tasteful intimacy products. Match the products to THEIR tastes.`
        : "";

      const aiResult = await callAI(
        [
          {
            role: "system",
            content: `You are an elite product sourcing specialist and buyer for a premium couples/relationship app called "Us". You have deep expertise in luxury consumer goods, wholesale sourcing, and e-commerce margins.

YOUR MISSION: Find and recommend exactly ${safeCount} REAL, SPECIFIC products that genuinely exist in the market right now.

CRITICAL RULES — FOLLOW THESE EXACTLY:
1. ONLY recommend products that ACTUALLY EXIST — use real product names, real brands, real SKUs where possible
2. Every product must be currently available to purchase (not discontinued)
3. Use the EXACT product name as it appears on the brand's website or retailer listings
4. Prices must be realistic — based on actual UK retail prices, not invented numbers
5. Wholesale estimates should reflect real trade pricing (typically 40-55% off RRP for beauty/lifestyle)

PRODUCT QUALITY STANDARDS:
- Premium quality befitting a luxury couples app (think Net-a-Porter, Space NK, Liberty London calibre)
- Products couples would genuinely use together or gift to each other
- Strong brand recognition or compelling emerging brand story
- Beautiful packaging / giftability is a major plus
- Avoid generic, mass-market, or cheap-looking products

SOURCING INTELLIGENCE — be specific and realistic:
- Faire.com: Check their actual categories — they carry excellent indie beauty, candles, homeware, and wellness brands
- Amazon Business UK: Good for established brands at volume pricing
- Brand direct wholesale: Many premium brands (Diptyque, ESPA, Rituals, Neal's Yard, Lush) offer trade accounts at 35-50% off RRP
- The Hut Group (THG): Lookfantastic, Dermstore — major beauty/wellness distributor with trade terms
- Sephora / Space NK: Key retailers for premium beauty
- Independent brands: Often offer the best margins (50-60% off RRP) via direct trade accounts
- Liberty London / Selfridges wholesale programmes for premium positioning

PRICING GUIDANCE:
- Sweet spot: £25-£150 retail price range (most impulse-giftable)
- Target 40-60% gross margin (e.g., wholesale £20, sell for £45-50)
- Always price in whole pence amounts (e.g. 4500 for £45.00, not 4999)

CATEGORIES (use exactly one from this list):
- Wellness (massage oils, bath products, skincare, personal care, self-care rituals)
- Intimacy (lingerie, blindfolds, couples' toys, nightwear, bodysuits)
- Gifts (fragrances, jewellery, personalised items, beauty products, accessories)
- Date Night (candles, cocktail kits, board games, conversation cards, wine accessories, fondue sets)
- Home (throws, bedding, glassware, cookware, diffusers, décor for couples)

IMPORTANT CATEGORY BALANCE: If the prompt doesn't specify a category, spread products across ALL 5 categories. Avoid loading up on any single category. Each category should ideally get at least 1 product.

For each product you MUST provide detailed, accurate:
- name: Exact real product name
- brand: Real brand name
- description: 2-3 sentence luxurious customer-facing description that sells the product
- longDescription: 4-5 sentence detailed description covering ingredients/materials, usage, and why it's special for couples
- priceInPence: Recommended retail price in pence (must be realistic)
- wholesalePriceEstimate: Trade/wholesale price in pence
- category: From the list above
- supplier: Specific real supplier name
- supplierUrl: Real URL where the product can be sourced
- imageUrl: Direct URL to the actual product image. CRITICAL IMAGE RULES:
  * Must be a direct image file URL ending in .jpg, .png, .webp or from a known CDN (NOT a page URL)
  * Best sources: Shopify CDNs (brand.com/cdn/shop/...), Amazon (m.media-amazon.com/images/I/...), thcdn.com/productimg, static.lookfantastic.com
  * For Shopify stores, use: https://brand.com/cdn/shop/products/PRODUCT-NAME_1024x.jpg or /cdn/shop/files/PRODUCT-NAME_1024x.png
  * AVOID URLs that require authentication, contain session tokens, or redirect to HTML pages
  * If you're unsure about the image URL, provide the brand's product page URL in supplierUrl and leave imageUrl as empty string — we'll scrape it automatically
- features: Array of 4-5 specific feature bullet points (include sizes, materials, key ingredients)
- marginNotes: Detailed sourcing strategy with actual estimated margins
- sizing: Object with type (one of: "volume", "weight", "dimensions", "clothing", "shade", "one-size"), options array (specific sizes/volumes), and optional guide string
- materials: Detailed ingredients or materials list
- whatsIncluded: Array of what comes in the package${personalisationBlock}`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "create_products",
              description: `Source ${safeCount} real, purchasable premium products for a couples app shop`,
              parameters: {
                type: "object",
                properties: {
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Exact real product name" },
                        brand: { type: "string", description: "Real brand/manufacturer" },
                        description: { type: "string", description: "2-3 sentence customer description" },
                        longDescription: { type: "string", description: "4-5 sentence detailed description" },
                        priceInPence: { type: "number", description: "Retail price in GBP pence" },
                        wholesalePriceEstimate: { type: "number", description: "Wholesale/trade price in GBP pence" },
                        category: { type: "string", description: "Product category" },
                        supplier: { type: "string", description: "Real wholesale supplier name" },
                        supplierUrl: { type: "string", description: "URL to source the product" },
                        imageUrl: { type: "string", description: "Direct URL to the real product image (.jpg/.png/.webp)" },
                        features: { type: "array", items: { type: "string" }, description: "4-5 feature bullets" },
                        marginNotes: { type: "string", description: "Sourcing strategy and margin info" },
                        sizing: {
                          type: "object",
                          properties: {
                            type: { type: "string" },
                            options: { type: "array", items: { type: "string" } },
                            guide: { type: "string" },
                          },
                          required: ["type", "options"],
                        },
                        materials: { type: "string", description: "Full ingredients/materials list" },
                        whatsIncluded: { type: "array", items: { type: "string" }, description: "Package contents" },
                      },
                      required: ["name", "brand", "description", "longDescription", "priceInPence", "wholesalePriceEstimate", "category", "supplier", "supplierUrl", "imageUrl", "features", "marginNotes", "sizing", "materials", "whatsIncluded"],
                    },
                  },
                },
                required: ["products"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "create_products" } },
        undefined,
        { model: "gpt-5.4", temperature: 0.7 }
      );

      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        return res.status(500).json({ error: "AI failed to generate products" });
      }

      const generated = JSON.parse(toolCall.function.arguments).products || [];
      if (generated.length === 0) {
        return res.status(500).json({ error: "AI returned no products" });
      }

      const stripe = await getUncachableStripeClient();
      const created: any[] = [];

      for (const p of generated) {
        const retailPence = Math.max(100, Math.round(Number(p.priceInPence) || 1000));
        let wholesalePence = Math.max(50, Math.round(Number(p.wholesalePriceEstimate) || 500));
        if (wholesalePence >= retailPence) {
          wholesalePence = Math.round(retailPence * 0.5);
        }
        const marginPercent = Math.round(((retailPence - wholesalePence) / retailPence) * 100);

        let verifiedImage = p.imageUrl && p.imageUrl.trim() ? await verifyImageUrl(p.imageUrl) : null;
        if (!verifiedImage) {
          console.log(`Image verification failed for "${p.name}" (${p.imageUrl || 'no URL'}), searching for real image...`);
          verifiedImage = await findRealProductImage(p.name, p.brand, p.supplierUrl);
          if (verifiedImage) {
            console.log(`Found real image for "${p.name}": ${verifiedImage}`);
          } else {
            console.log(`No verified image found for "${p.name}"`);
          }
        } else {
          console.log(`Image verified for "${p.name}": ${verifiedImage}`);
        }
        const productImages = verifiedImage ? [verifiedImage] : [];

        const product = await stripe.products.create({
          name: `${p.name} — ${p.brand}`,
          description: p.description,
          images: productImages,
          metadata: {
            brand: p.brand,
            category: p.category,
            shop_product_name: p.name,
            features: JSON.stringify(p.features || []).slice(0, 500),
            long_description: (p.longDescription || p.description).slice(0, 500),
            sizing: JSON.stringify(p.sizing || {}).slice(0, 500),
            materials: (p.materials || "").slice(0, 500),
            whats_included: JSON.stringify(p.whatsIncluded || []).slice(0, 500),
            supplier: p.supplier || "",
            supplier_url: p.supplierUrl || "",
            wholesale_price: String(wholesalePence),
            margin_notes: (p.marginNotes || "").slice(0, 500),
            margin_percent: String(marginPercent),
          },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: retailPence,
          currency: "gbp",
        });

        created.push({
          productId: product.id,
          priceId: price.id,
          name: p.name,
          brand: p.brand,
          retailPrice: `£${(retailPence / 100).toFixed(2)}`,
          wholesalePrice: `£${(wholesalePence / 100).toFixed(2)}`,
          margin: `${marginPercent}%`,
          description: p.description,
          longDescription: p.longDescription,
          category: p.category,
          features: p.features,
          supplier: p.supplier,
          supplierUrl: p.supplierUrl,
          marginNotes: p.marginNotes,
          sizing: p.sizing,
          materials: p.materials,
          whatsIncluded: p.whatsIncluded,
        });
      }

      shopProductsCache = null;
      shopCacheTime = 0;

      res.json({
        message: `Created ${created.length} products in Stripe`,
        products: created,
      });
    } catch (e: any) {
      console.error("AI create products error:", e.message);
      res.status(500).json({ error: e.message || "Failed to create products" });
    }
  });

  app.delete("/api/stripe/products/all", async (req: Request, res: Response) => {
    try {
      const adminUserId = await requireAdmin(req, res);
      if (!adminUserId) return;

      const stripe = await getUncachableStripeClient();
      const allProducts = await stripe.products.list({ active: true, limit: 100 });
      let deactivated = 0;
      for (const sp of allProducts.data) {
        try {
          await stripe.products.update(sp.id, { active: false });
          deactivated++;
        } catch (e: any) {
          console.error(`Failed to deactivate ${sp.id}:`, e.message);
        }
      }
      shopProductsCache = null;
      shopCacheTime = 0;
      res.json({ success: true, message: `Deactivated ${deactivated} products` });
    } catch (e: any) {
      console.error("Clear all products error:", e.message);
      res.status(500).json({ error: "Failed to clear products" });
    }
  });

  app.post("/api/stripe/refresh-catalogue", async (req: Request, res: Response) => {
    try {
      const adminUserId = await requireAdmin(req, res);
      if (!adminUserId) return;

      const stripe = await getUncachableStripeClient();
      const validNames = new Set(LUXURY_INTIMACY_PRODUCTS.map(p => p.name.toLowerCase().trim()));

      const allProducts: any[] = [];
      let hasMore = true;
      let startingAfter: string | undefined;
      while (hasMore) {
        const params: any = { active: true, limit: 100 };
        if (startingAfter) params.starting_after = startingAfter;
        const batch = await stripe.products.list(params);
        allProducts.push(...batch.data);
        hasMore = batch.has_more;
        if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
      }

      let archived = 0;
      for (const sp of allProducts) {
        const shopName = sp.metadata?.shop_product_name?.toLowerCase()?.trim();
        if (!shopName || !validNames.has(shopName)) {
          await stripe.products.update(sp.id, { active: false });
          archived++;
        }
      }

      const existingNames = new Set(allProducts.filter(sp => sp.active !== false).map(sp => sp.metadata?.shop_product_name?.toLowerCase()?.trim()).filter(Boolean));
      let created = 0;
      for (const lp of LUXURY_INTIMACY_PRODUCTS) {
        if (existingNames.has(lp.name.toLowerCase().trim())) continue;
        const existing = await stripe.products.search({ query: `name~'${lp.name.replace(/'/g, "\\'")}'` });
        if (existing.data.length > 0 && existing.data.some((p: any) => p.active)) continue;

        const imageUrl = lp.imageUrl || null;
        const product = await stripe.products.create({
          name: `${lp.name} — ${lp.brand}`,
          description: lp.description,
          images: imageUrl ? [imageUrl] : [],
          metadata: {
            brand: lp.brand,
            category: lp.category,
            shop_product_name: lp.name,
          },
        });
        const priceMatch = lp.price.match(/[\d.]+/);
        const unitAmount = priceMatch ? Math.round(parseFloat(priceMatch[0]) * 100) : 0;
        if (unitAmount > 0) {
          await stripe.prices.create({ product: product.id, unit_amount: unitAmount, currency: 'gbp' });
        }
        created++;
      }

      shopProductsCache = null;
      shopCacheTime = 0;
      res.json({ success: true, message: `Archived ${archived} old products, created ${created} new products` });
    } catch (e: any) {
      console.error("Refresh catalogue error:", e.message);
      res.status(500).json({ error: e.message || "Failed to refresh catalogue" });
    }
  });

  app.post("/api/stripe/fix-images", async (req: Request, res: Response) => {
    try {
      const adminUserId = await requireAdmin(req, res);
      if (!adminUserId) return;

      const stripe = await getUncachableStripeClient();
      const allProductsList: any[] = [];
      let hasMore = true;
      let startingAfter: string | undefined;
      while (hasMore) {
        const params: any = { active: true, limit: 100 };
        if (startingAfter) params.starting_after = startingAfter;
        const batch = await stripe.products.list(params);
        allProductsList.push(...batch.data);
        hasMore = batch.has_more;
        if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
      }
      const results: { name: string; status: string; imageUrl?: string }[] = [];

      for (const sp of allProductsList) {
        const productName = sp.metadata?.shop_product_name || sp.name;
        const brand = sp.metadata?.brand || "";

        if (sp.images && sp.images.length > 0) {
          const existingVerified = await verifyImageUrl(sp.images[0]);
          if (existingVerified) {
            results.push({ name: productName, status: "already_has_image", imageUrl: existingVerified });
            continue;
          }
        }

        console.log(`Fixing image for: ${productName} (${brand})`);
        const supplierUrl = sp.metadata?.supplier_url || "";
        const foundImage = await findRealProductImage(productName, brand, supplierUrl || undefined);

        if (foundImage) {
          await stripe.products.update(sp.id, { images: [foundImage] });
          console.log(`  Fixed: ${foundImage}`);
          results.push({ name: productName, status: "fixed", imageUrl: foundImage });
        } else {
          console.log(`  No image found`);
          results.push({ name: productName, status: "no_image_found" });
        }
      }

      shopProductsCache = null;
      shopCacheTime = 0;

      const fixed = results.filter(r => r.status === "fixed").length;
      const alreadyOk = results.filter(r => r.status === "already_has_image").length;
      const failed = results.filter(r => r.status === "no_image_found").length;

      res.json({
        success: true,
        message: `Fixed ${fixed} images, ${alreadyOk} already OK, ${failed} could not be found`,
        results,
      });
    } catch (e: any) {
      console.error("Fix images error:", e.message);
      res.status(500).json({ error: "Failed to fix images" });
    }
  });

  app.delete("/api/stripe/products/:productId", async (req: Request, res: Response) => {
    try {
      const adminUserId = await requireAdmin(req, res);
      if (!adminUserId) return;

      const { productId } = req.params;
      if (!productId || !productId.startsWith("prod_")) {
        return res.status(400).json({ error: "Valid product ID required" });
      }
      const stripe = await getUncachableStripeClient();
      await stripe.products.update(productId, { active: false });
      shopProductsCache = null;
      shopCacheTime = 0;
      res.json({ success: true, message: "Product deactivated" });
    } catch (e: any) {
      console.error("Delete product error:", e.message);
      res.status(500).json({ error: "Failed to deactivate product" });
    }
  });
}
