const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

function extractItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                  block.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const rawDesc = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
                    block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "";
    // Strip HTML for a plain-text preview
    const description = rawDesc.replace(/<[^>]+>/g, "").trim().slice(0, 200);
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    items.push({ title, link, description, pubDate });
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newsletters } = await req.json();
    if (!newsletters || !Array.isArray(newsletters) || newsletters.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'newsletters array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 5 newsletters
    const slugs = newsletters.slice(0, 5).map((n: string) =>
      n.trim().toLowerCase().replace(/^@/, "").replace(/\.substack\.com.*/, "")
    );

    const allItems: (FeedItem & { newsletter: string })[] = [];

    for (const slug of slugs) {
      try {
        const res = await fetch(`https://${slug}.substack.com/feed`, {
          headers: { 'User-Agent': 'LovableApp/1.0' },
        });
        if (!res.ok) continue;
        const xml = await res.text();
        const items = extractItems(xml).slice(0, 3);
        items.forEach((item) => allItems.push({ ...item, newsletter: slug }));
      } catch {
        // Skip failed feeds
      }
    }

    // Sort by date, newest first
    allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    return new Response(
      JSON.stringify({ success: true, items: allItems.slice(0, 8) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
