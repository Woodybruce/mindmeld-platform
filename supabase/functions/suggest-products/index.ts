import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fetch a real product image from Amazon search by scraping the first result image
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
    // Match Amazon CDN image patterns from search results
    const patterns = [
      /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%._-]+?\.(?:jpg|png|jpeg)(?=["\s])/g,
      /https:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/[A-Za-z0-9%._-]+?\.(?:jpg|png|jpeg)(?=["\s])/g,
    ];
    for (const pattern of patterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        // Filter out tiny/icon images (look for ones with size hints or just pick first reasonable one)
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { category } = await req.json().catch(() => ({ category: "general" }));

    // Step 1: Get AI product suggestions (without imageUrl — we'll fetch them ourselves)
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a product recommendation engine for a couples/relationship app. 
Suggest 4 real, purchasable products that couples would love. Mix categories: Date Night, Wellness, Travel, Intimacy, Experiences, Games, Home, Books.
Use real brand names, realistic GBP prices, short descriptions (max 60 chars).
For productUrl: "https://www.amazon.co.uk/s?k=PRODUCT+NAME+BRAND&tag=woodybruce-21"
For imageSearchTerm: provide a 3-5 word search term to find this product on Amazon (e.g. "couples massage oil gift set", "scratch world map poster").
Category must be one of: Date Night, Wellness, Travel, Intimacy, Experiences, Games, Home, Books, Stationery, Dining.`,
            },
            {
              role: "user",
              content: `Suggest 4 products for couples. Category hint: ${category}. Make them varied and gift-worthy for February.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_products",
                description: "Return 4 product suggestions for couples",
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
                          category: { type: "string" },
                          emoji: { type: "string" },
                          affiliateTag: { type: "string" },
                          imageSearchTerm: { type: "string", description: "3-5 word Amazon search term to find a real product image" },
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
          tool_choice: { type: "function", function: { name: "suggest_products" } },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let products;
    if (toolCall?.function?.arguments) {
      products = JSON.parse(toolCall.function.arguments).products;
    } else {
      throw new Error("No tool call response from AI");
    }

    // Step 2: For each product, fetch a real Amazon image by scraping search results
    const enriched = await Promise.all((products || []).map(async (p: any) => {
      const searchTerm = p.imageSearchTerm || `${p.name} ${p.brand}`;
      const imageUrl = await fetchAmazonProductImage(searchTerm);
      return { ...p, imageUrl };
    }));

    return new Response(JSON.stringify({ products: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-products error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
