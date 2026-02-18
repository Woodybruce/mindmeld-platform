import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_PRODUCTS = [
  { name: "Couples Massage Oil Gift Set", brand: "Intimate Earth", price: "£24.99", description: "Sensual massage oils for two", category: "Massage", emoji: "💆", affiliateTag: "massage-oil-set", productUrl: "https://www.amazon.co.uk/s?k=couples+massage+oil+gift+set&tag=woodybruce-21" },
  { name: "Couples Intimacy Card Game", brand: "Lovehoney", price: "£14.99", description: "50 fun dares and questions for couples", category: "Games", emoji: "🃏", affiliateTag: "couples-game", productUrl: "https://www.amazon.co.uk/s?k=couples+intimacy+card+game&tag=woodybruce-21" },
  { name: "Silk Chemise Lingerie Set", brand: "Bluebella", price: "£39.99", description: "Elegant silk-feel lingerie for her", category: "Lingerie", emoji: "🌸", affiliateTag: "silk-lingerie", productUrl: "https://www.amazon.co.uk/s?k=silk+chemise+lingerie+set&tag=woodybruce-21" },
  { name: "Scented Massage Candle", brand: "Jimmyjane", price: "£28.00", description: "Melts into warm massage oil", category: "Candles", emoji: "🕯️", affiliateTag: "massage-candle", productUrl: "https://www.amazon.co.uk/s?k=scented+massage+candle+couples&tag=woodybruce-21" },
];

async function fetchAmazonProductImage(searchTerm: string): Promise<string | null> {
  try {
    const url = `https://www.amazon.co.uk/s?k=${encodeURIComponent(searchTerm)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();
    const patterns = [
      /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%._-]+?\.(?:jpg|png|jpeg)(?=["\s])/g,
      /https:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/[A-Za-z0-9%._-]+?\.(?:jpg|png|jpeg)(?=["\s])/g,
    ];
    for (const pattern of patterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        const goodMatch = matches.find(m => !m.includes("sprite") && !m.includes("icon") && !m.includes("logo") && !m.includes("transparent")) || matches[0];
        if (goodMatch) return goodMatch;
      }
    }
  } catch (e) {
    console.error("Amazon image fetch error:", e);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    await req.json().catch(() => ({}));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a product recommender for a couples wellness app. Suggest 4 romantic and intimate products on Amazon UK.
Include: couples massage oils, candles, bath sets, card games, lingerie, massage candles, couples vibrators, sensual gift sets.
For productUrl: "https://www.amazon.co.uk/s?k=SEARCH+TERM&tag=woodybruce-21"
For imageSearchTerm: provide a 3-5 word Amazon search that would find a real photo of this product.
Keep descriptions under 60 chars.`,
          },
          {
            role: "user",
            content: `Suggest 4 couples intimate and romantic products for Amazon UK. Include at least one couples vibrator or massager.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_intimacy",
              description: "Return 4 couples intimacy product suggestions",
              parameters: {
                type: "object",
                properties: {
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        brand: { type: "string" },
                        price: { type: "string" },
                        description: { type: "string" },
                        category: { type: "string", enum: ["Massage", "Candles", "Games", "Lingerie", "Bath", "Toys", "Accessories", "Vibrators", "Bondage"] },
                        emoji: { type: "string" },
                        affiliateTag: { type: "string" },
                        imageSearchTerm: { type: "string" },
                        productUrl: { type: "string" },
                      },
                      required: ["name", "brand", "price", "description", "category", "emoji", "affiliateTag", "imageSearchTerm", "productUrl"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["products"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_intimacy" } },
      }),
    });

    if (!response.ok) {
      console.error("AI error:", response.status);
      return new Response(JSON.stringify({ products: FALLBACK_PRODUCTS }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let products;
    if (toolCall?.function?.arguments) {
      products = JSON.parse(toolCall.function.arguments).products;
    } else {
      products = FALLBACK_PRODUCTS;
    }

    if (!products?.length) products = FALLBACK_PRODUCTS;

    // Fetch real Amazon images by scraping search results
    const enriched = await Promise.all(products.map(async (p: any) => {
      const searchTerm = p.imageSearchTerm || `${p.name} ${p.brand}`;
      const imageUrl = await fetchAmazonProductImage(searchTerm);
      return { ...p, imageUrl };
    }));

    return new Response(JSON.stringify({ products: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-intimacy error:", e);
    return new Response(
      JSON.stringify({ products: FALLBACK_PRODUCTS }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
