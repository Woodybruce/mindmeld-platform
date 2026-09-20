// Image lookup/verification helpers shared by the legacy AI and shop routes.
// Moved verbatim from server/routes.ts (Task 10).

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";

const imageCache = new Map<string, string | null>();

export async function searchPexelsImage(query: string): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;
  if (imageCache.has(query)) return imageCache.get(query)!;
  try {
    const resp = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const url = data.photos?.[0]?.src?.medium || null;
    imageCache.set(query, url);
    return url;
  } catch {
    return null;
  }
}

export async function resolveProductImage(product: any): Promise<string | null> {
  if (product.imageUrl) return product.imageUrl;
  const keyword = product.imageKeyword || `${product.brand} ${product.name} luxury`;
  return searchPexelsImage(keyword);
}

export async function fetchAmazonProductImage(searchTerm: string): Promise<string | null> {
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

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" ||
        hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.") ||
        hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function verifyImageUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== "string" || !isSafeUrl(url)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);
    const ct = resp.headers.get("content-type") || "";
    if (resp.ok && ct.startsWith("image/")) return url;
    const getResp = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000), redirect: "follow" });
    const getCt = getResp.headers.get("content-type") || "";
    if (getResp.ok && getCt.startsWith("image/")) return url;
    return null;
  } catch {
    return null;
  }
}

export async function scrapeProductImage(pageUrl: string): Promise<string | null> {
  if (!isSafeUrl(pageUrl)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(pageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const html = await resp.text();

    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch?.[1]) {
      const verified = await verifyImageUrl(ogMatch[1]);
      if (verified) return verified;
    }

    const imgMatches = html.match(/https?:\/\/[^\s"'<>)]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>)]*)?/gi);
    if (imgMatches) {
      const productImages = imgMatches.filter((u: string) =>
        (u.includes("product") || u.includes("catalog") || u.includes("media") || u.includes("images") || u.includes("cdn")) &&
        !u.includes("logo") && !u.includes("icon") && !u.includes("favicon") && !u.includes("sprite") &&
        !u.includes("banner") && !u.includes("1x1") && !u.includes("pixel") && !u.includes("thumbnail") &&
        u.length > 30
      );
      const candidates = productImages.length > 0 ? productImages : imgMatches;
      for (const imgUrl of candidates.slice(0, 5)) {
        const verified = await verifyImageUrl(imgUrl);
        if (verified) return verified;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function findRealProductImage(name: string, brand: string, supplierUrl?: string): Promise<string | null> {
  if (supplierUrl && supplierUrl.length > 10) {
    const fromSupplier = await scrapeProductImage(supplierUrl);
    if (fromSupplier) return fromSupplier;
  }

  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return null;

    const searchResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `You have web search. Find a DIRECT image URL for this product. 

RULES:
1. Search for the product on the brand's official website, Amazon UK, John Lewis, or major retailers
2. Return the DIRECT image file URL (must end in .jpg, .jpeg, .png, or .webp, OR be from a known CDN like m.media-amazon.com/images, cdn.shopify.com, static.thcdn.com, i.johnlewis.com)
3. For Amazon products, use URLs like: https://m.media-amazon.com/images/I/XXXXX._SL500_.jpg
4. For Shopify stores, use URLs like: https://brand.com/cdn/shop/products/NAME_1024x.jpg
5. Return ONLY the direct image URL on a single line, nothing else
6. If you truly cannot find an image, return NONE

Do NOT return product page URLs. Only return direct image file URLs.` },
          { role: "user", content: `${brand} ${name}` },
        ],
        max_tokens: 300,
        temperature: 0,
        web_search_options: { search_context_size: "high" },
      }),
    });
    if (searchResp.ok) {
      const data = await searchResp.json();
      const content = data.choices?.[0]?.message?.content?.trim() || "";
      const urls = content.match(/https?:\/\/[^\s"'<>\)]+/g) || [];
      for (const url of urls) {
        if (url === "NONE") continue;
        console.log(`  OpenAI suggested image: ${url}`);
        const verified = await verifyImageUrl(url);
        if (verified) return verified;
        const fromPage = await scrapeProductImage(url);
        if (fromPage) return fromPage;
      }
    }
  } catch (e) {
    console.error(`  Image search error for "${name}":`, e);
  }

  return null;
}
