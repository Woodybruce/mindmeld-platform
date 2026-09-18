import type { Express, Request, Response } from "express";
import { extractUserId } from "../../middleware/auth";
import { callAI } from "../../lib/ai";
import { fetchAmazonProductImage } from "../../lib/images";
import { AMAZON_TAG, buildAmazonUrl } from "../../lib/shop";
import { LUXURY_INTIMACY_PRODUCTS } from "../../shopProducts";

// Legacy AI routes: feed-content generation, curated content (articles,
// podcasts, videos, quotes), suggest-* endpoints and /api/ai-search.
// Moved verbatim from server/routes.ts (Task 10).

const REAL_ARTICLES = [
  { title: "The 5 Love Languages", description: "Discover which love language speaks to you and your partner", source: "Verywell Mind", category: "Connection", emoji: "\u{1F4AC}", url: "https://www.verywellmind.com/can-the-5-love-languages-help-your-relationship-4783538", imageHint: "couple talking" },
  { title: "Active Listening Skills for Couples", description: "Transform how you connect with your partner through listening", source: "Verywell Mind", category: "Communication", emoji: "\u{1F442}", url: "https://www.verywellmind.com/what-is-active-listening-3024343", imageHint: "listening couple" },
  { title: "The Four Horsemen of Relationships", description: "Four communication patterns that predict relationship breakdown", source: "Gottman Institute", category: "Communication", emoji: "\u26A0\uFE0F", url: "https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/", imageHint: "couple conflict" },
  { title: "Emotional Bids: How Couples Connect", description: "The small moments that build or break your relationship", source: "Gottman Institute", category: "Communication", emoji: "\u2764\uFE0F", url: "https://www.gottman.com/blog/want-to-improve-your-relationship-start-paying-more-attention-to-bids/", imageHint: "emotional needs" },
  { title: "How to Communicate Better in a Relationship", description: "Research-backed communication skills for stronger relationships", source: "Positive Psychology", category: "Communication", emoji: "\u{1F5E3}\uFE0F", url: "https://positivepsychology.com/communication-in-relationships/", imageHint: "couple conversation" },
  { title: "Building Emotional Intimacy", description: "Simple daily habits that deepen your bond over time", source: "Verywell Mind", category: "Intimacy", emoji: "\u{1F495}", url: "https://www.verywellmind.com/what-is-intimacy-2795161", imageHint: "emotional connection" },
  { title: "The Role of Physical Affection", description: "Why non-sexual touch is vital for long-term connection", source: "mindbodygreen", category: "Intimacy", emoji: "\u{1FAC2}", url: "https://www.mindbodygreen.com/articles/physical-touch-love-language", imageHint: "couple touching" },
  { title: "40 Questions to Build Intimacy", description: "Deepen your connection with thoughtful conversation starters", source: "Verywell Mind", category: "Intimacy", emoji: "\u{1F48B}", url: "https://www.verywellmind.com/questions-to-build-intimacy-in-relationships-1270942", imageHint: "couple intimacy" },
  { title: "Healthy Sex Life in Relationships", description: "Open conversations and ideas for a fulfilling intimate life", source: "Healthline", category: "Intimacy", emoji: "\u{1F336}\uFE0F", url: "https://www.healthline.com/health/healthy-relationship", imageHint: "intimate couple" },
  { title: "17 Fun Couple Activities to Enjoy Together", description: "Creative ways to enjoy each other's company at home or out", source: "Verywell Mind", category: "Date Ideas", emoji: "\u{1F56F}\uFE0F", url: "https://www.verywellmind.com/fun-things-couples-can-do-together-3129598", imageHint: "romantic date home" },
  { title: "Why New Experiences Strengthen Relationships", description: "The neuroscience behind why shared adventures deepen love", source: "Harvard Health", category: "Fun", emoji: "\u{1F9D7}", url: "https://www.health.harvard.edu/mind-and-mood/the-health-benefits-of-strong-relationships", imageHint: "couple adventure" },
  { title: "Managing Conflict in Relationships", description: "Healthy strategies to navigate disagreements together", source: "Gottman Institute", category: "Communication", emoji: "\u{1F9E9}", url: "https://www.gottman.com/blog/managing-conflict-solvable-vs-perpetual-problems/", imageHint: "couple discussion" },
  { title: "Relationship Trust Building", description: "How to build and rebuild trust in your relationship", source: "Healthline", category: "Growth", emoji: "\u{1F91D}", url: "https://www.healthline.com/health/how-to-rebuild-trust", imageHint: "trust couple" },
  { title: "The Science of Gratitude in Love", description: "How saying 'thank you' transforms your relationship", source: "Greater Good Magazine", category: "Gratitude", emoji: "\u{1F64F}", url: "https://greatergood.berkeley.edu/topic/gratitude", imageHint: "grateful couple" },
  { title: "Attachment Styles Explained", description: "Understanding how your attachment style affects your love life", source: "Verywell Mind", category: "Growth", emoji: "\u{1F517}", url: "https://www.verywellmind.com/attachment-styles-2795344", imageHint: "attachment bond" },
  { title: "How to Keep the Spark Alive", description: "Evidence-based ways to maintain romance in long relationships", source: "Mark Manson", category: "Intimacy", emoji: "\u2728", url: "https://markmanson.net/healthy-relationship-habits", imageHint: "romantic couple" },
  { title: "The Power of Date Nights", description: "Why regular date nights are essential for lasting love", source: "Mark Manson", category: "Date Ideas", emoji: "\u{1F319}", url: "https://markmanson.net/love", imageHint: "date night" },
  { title: "Self-Care for Better Relationships", description: "Taking care of yourself so you can love better", source: "Verywell Mind", category: "Wellness", emoji: "\u{1F9D8}", url: "https://www.verywellmind.com/self-care-strategies-overall-stress-reduction-3144729", imageHint: "self care" },
  { title: "The Art of Compromise in Relationships", description: "How to find middle ground without losing yourself", source: "TIME", category: "Communication", emoji: "\u{1F91D}", url: "https://time.com/5321262/science-compromise-relationship/", imageHint: "couple compromise" },
  { title: "How to Set Healthy Boundaries", description: "Boundaries aren't walls — they're bridges to better connection", source: "Positive Psychology", category: "Growth", emoji: "\u{1F6A7}", url: "https://positivepsychology.com/healthy-boundaries/", imageHint: "healthy boundaries" },
  { title: "Rekindling Intimacy in Your Relationship", description: "The common reasons intimacy fades and how to reignite it", source: "Healthline", category: "Intimacy", emoji: "\u{1F525}", url: "https://www.healthline.com/health/mental-health/set-boundaries", imageHint: "couple intimacy" },
  { title: "The Magic Ratio of Relationships", description: "Gottman's 5:1 ratio — five positive interactions for every negative one", source: "Gottman Institute", category: "Communication", emoji: "\u2728", url: "https://www.gottman.com/blog/the-magic-relationship-ratio-according-science/", imageHint: "happy couple ratio" },
  { title: "How to Apologise Properly", description: "The six components of a meaningful apology that actually heals", source: "Verywell Mind", category: "Communication", emoji: "\u{1F64F}", url: "https://www.verywellmind.com/how-to-apologize-more-sincerely-3144467", imageHint: "apology couple" },
  { title: "Mindfulness for Couples", description: "How practising presence together strengthens your bond", source: "Positive Psychology", category: "Wellness", emoji: "\u{1F9D8}", url: "https://positivepsychology.com/mindfulness-exercises-techniques-activities/", imageHint: "mindful couple meditation" },
  { title: "Financial Planning as a Couple", description: "Money conversations that bring you closer instead of driving you apart", source: "APA", category: "Practical", emoji: "\u{1F4B0}", url: "https://www.apa.org/topics/money", imageHint: "couple finances" },
  { title: "The Importance of Play in Relationships", description: "Why laughter and silliness are serious relationship tools", source: "HelpGuide", category: "Fun", emoji: "\u{1F3AE}", url: "https://www.helpguide.org/mental-health/wellbeing/laughter-is-the-best-medicine", imageHint: "couple playing laughing" },
  { title: "Navigating Life Transitions Together", description: "How to stay connected through big changes like moving, babies and career shifts", source: "HelpGuide", category: "Growth", emoji: "\u{1F331}", url: "https://www.helpguide.org/mental-health/stress/stress-management", imageHint: "couple life change" },
  { title: "How to Fight Fair", description: "Rules of engagement for productive disagreements that strengthen your bond", source: "HelpGuide", category: "Communication", emoji: "\u{1F94A}", url: "https://www.helpguide.org/relationships/communication/conflict-resolution-skills", imageHint: "couple disagreement" },
  { title: "The Science of Love and Bonding", description: "Understanding the 'love hormone' and how it deepens attachment", source: "Harvard Health", category: "Science", emoji: "\u{1F9EA}", url: "https://www.health.harvard.edu/mind-and-mood/oxytocin-the-love-hormone", imageHint: "oxytocin bonding" },
];

const CURATED_PODCASTS = [
  { title: "Where Should We Begin?", description: "Step inside real therapy sessions with couples navigating love, betrayal, and desire", host: "Esther Perel", category: "Therapy", spotifyId: "2LfEXBqTmGJMPMYfAVHdj4", appleId: "1237931798", imageUrl: "", duration: "40 min" },
  { title: "Modern Love", description: "Real stories of love, loss, and redemption from the New York Times column", host: "New York Times", category: "Stories", spotifyId: "03Er7mSPHvc2Dn8gP5odMh", appleId: "1065559535", imageUrl: "", duration: "25 min" },
  { title: "Foreplay — Couples & Sex Therapy", description: "Sex therapists discuss intimacy, desire, and keeping the spark alive", host: "Laurie Watson", category: "Intimacy", spotifyId: "5kKKuebRUxNsaKLPM7hIBt", appleId: "1083324677", imageUrl: "", duration: "30 min" },
  { title: "Relationship Alive!", description: "Deep-dive conversations with world-renowned relationship experts", host: "Neil Sattin", category: "Growth", spotifyId: "6cQwLbS6rAku3Y84fN3aPU", appleId: "1037691804", imageUrl: "", duration: "60 min" },
  { title: "The Love Fix", description: "Clinical psychologist helps couples navigate real relationship challenges", host: "Dr Tari Mack", category: "Advice", spotifyId: "3jYyI64kRl4wERdfIc0fQO", appleId: "1551411428", imageUrl: "", duration: "45 min" },
  { title: "The Secure Love Podcast", description: "Attachment theory in action — heal anxious & avoidant patterns", host: "Julie Menanno", category: "Growth", spotifyId: "6HwbZhlhLzBJXJEq9OWaOX", appleId: "1753342452", imageUrl: "", duration: "25 min" },
  { title: "We Can Do Hard Things", description: "Glennon Doyle tackles love, identity, and partnership with radical honesty", host: "Glennon Doyle", category: "Growth", spotifyId: "5swfO4bVmFrcUsQjGeBp2o", appleId: "1564530722", imageUrl: "", duration: "50 min" },
  { title: "Just Between Us Ghoulfriends", description: "Honest chats about dating, marriage, and everything in between", host: "Allison & Gaby", category: "Fun", spotifyId: "2afVjOVyRWzyWBi8qrNkeJ", appleId: "1440694086", imageUrl: "", duration: "35 min" },
  { title: "Couples Therapy", description: "Candid conversations about modern love, dating and everything couples go through", host: "Naistoise Pointet & Andy Gallagher", category: "Fun", spotifyId: "4bOjKjHwMabow4y3KdPcZs", appleId: "1458699122", imageUrl: "", duration: "45 min" },
  { title: "The Couples Therapist Couch", description: "A therapist shares tools and insights for building a thriving relationship", host: "Shane Birkel", category: "Therapy", spotifyId: "0otDmfAYSUaEjBoYOxQCL7", appleId: "1251578818", imageUrl: "", duration: "40 min" },
  { title: "The Gottman Relationship Coach", description: "Science-backed relationship skills from the world's leading couples research institute", host: "Gottman Institute", category: "Growth", spotifyId: "2I4xsSiDLiQRWNMF7SIvKt", appleId: "1588107023", imageUrl: "", duration: "30 min" },
  { title: "Dear Therapists", description: "Lori Gottlieb and Guy Winch help real people with their relationship dilemmas", host: "Lori Gottlieb & Guy Winch", category: "Advice", spotifyId: "1f8XB2kQVfXvFGwDCGdQ8r", appleId: "1458710283", imageUrl: "", duration: "35 min" },
  { title: "How's Work?", description: "Esther Perel coaches real colleagues through workplace relationships and dynamics", host: "Esther Perel", category: "Growth", spotifyId: "6wlHuJJ0JhD6Zt0kIbKH8R", appleId: "1476831473", imageUrl: "", duration: "45 min" },
  { title: "Unlocking Us", description: "Brene Brown explores what it means to be brave, connected and wholehearted", host: "Brene Brown", category: "Connection", spotifyId: "3UDLSY7sGSX5xmOFCqLViD", appleId: "1504099185", imageUrl: "", duration: "55 min" },
  { title: "On Purpose", description: "Jay Shetty interviews thought leaders on love, purpose and building meaningful relationships", host: "Jay Shetty", category: "Growth", spotifyId: "5EqqB52m2bsr4k1Ii7sStc", appleId: "1450994021", imageUrl: "", duration: "60 min" },
  { title: "Ten Percent Happier", description: "Meditation and mindfulness for sceptics — great episodes on loving relationships", host: "Dan Harris", category: "Wellness", spotifyId: "1CfW319UkBMVhiTb0WKxyp", appleId: "1087147821", imageUrl: "", duration: "50 min" },
];

const CURATED_VIDEOS = [
  { title: "The Secret to Desire in Long-Term Relationships", description: "Esther Perel reveals why desire fades and how to bring it back", creator: "TED", category: "Intimacy", emoji: "\u{1F525}", youtubeId: "sa0RUmGTCYY", tedSlug: "esther_perel_the_secret_to_desire_in_a_long_term_relationship", duration: "19 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/f0420115a72f8b4ce1f54bdf96dd3dc700fee0aa_2880x1620.jpg?w=560" },
  { title: "How to Make Love Last", description: "Neuroscientist Helen Fisher on the science behind lasting love", creator: "TED", category: "Science", emoji: "\u{1F9EC}", youtubeId: "OYfoGTIG7pY", tedSlug: "helen_fisher_the_brain_in_love", duration: "18 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/26035_480x360.jpg?w=560" },
  { title: "The 4 Attachment Styles Explained", description: "Understand how your attachment style shapes your relationships", creator: "The School of Life", category: "Growth", emoji: "\u{1F517}", youtubeId: "2s9ACDMcpjA", tedSlug: "", duration: "7 min", thumbnailUrl: "" },
  { title: "10 Ways to Have a Better Conversation", description: "Communication tips that will transform every relationship", creator: "TED", category: "Communication", emoji: "\u{1F4AC}", youtubeId: "R1vskiVDwl4", tedSlug: "celeste_headlee_10_ways_to_have_a_better_conversation", duration: "12 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/353ddb2a3a8e3cfb9ea7b61f3f1a884e3f39bc79_2880x1620.jpg?w=560" },
  { title: "Why We All Need to Practice Emotional First Aid", description: "How taking care of your emotional health benefits your relationship", creator: "TED", category: "Wellness", emoji: "\u{1FA79}", youtubeId: "F2hc2FLOdhI", tedSlug: "guy_winch_why_we_all_need_to_practice_emotional_first_aid", duration: "18 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/8b5bbd28ba62f7e1ab1e53020762d58a8d3bba9d_2880x1620.jpg?w=560" },
  { title: "The Power of Vulnerability", description: "Brene Brown on how vulnerability is the birthplace of connection", creator: "TED", category: "Connection", emoji: "\u2764\uFE0F", youtubeId: "iCvmsMzlF7o", tedSlug: "brene_brown_the_power_of_vulnerability", duration: "21 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/93e66fc02eb5b86537e1ccf37c53875c4ff3edda_2880x1620.jpg?w=560" },
  { title: "How to Fix a Broken Relationship", description: "John Gottman breaks down the key to repairing relationship trust", creator: "Big Think", category: "Communication", emoji: "\u{1F527}", youtubeId: "AKTyPgwfPgg", tedSlug: "", duration: "8 min", thumbnailUrl: "" },
  { title: "5 Love Languages Explained", description: "Gary Chapman walks through each love language with examples", creator: "Gary Chapman", category: "Connection", emoji: "\u{1F5E3}\uFE0F", youtubeId: "doRMsni0sno", tedSlug: "", duration: "10 min", thumbnailUrl: "" },
  { title: "Rethinking Infidelity", description: "Esther Perel explores why people cheat and what it means for modern love", creator: "TED", category: "Therapy", emoji: "\u{1F4A1}", youtubeId: "P2AUat93a8Q", tedSlug: "esther_perel_rethinking_infidelity_a_talk_for_anyone_who_has_ever_loved", duration: "21 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/f88a5e5bea6c59a34015e2df3f0aa02e35b93ddd_2880x1620.jpg?w=560" },
  { title: "A Better Way to Talk About Love", description: "Mandy Len Catron on how the stories we tell about love shape how we experience it", creator: "TED", category: "Stories", emoji: "\u{1F4D6}", youtubeId: "tVY8m6bU0XQ", tedSlug: "mandy_len_catron_a_better_way_to_talk_about_love", duration: "14 min", thumbnailUrl: "" },
  { title: "The Mathematics of Love", description: "Mathematician Hannah Fry reveals the hidden patterns behind successful relationships", creator: "TED", category: "Science", emoji: "\u{1F4CA}", youtubeId: "yFVXsjVdvmY", tedSlug: "hannah_fry_the_mathematics_of_love", duration: "17 min", thumbnailUrl: "" },
  { title: "What Makes a Good Life?", description: "The longest study on happiness reveals that good relationships keep us healthier and happier", creator: "TED", category: "Science", emoji: "\u{1F331}", youtubeId: "8KkKuTCFvzI", tedSlug: "robert_waldinger_what_makes_a_good_life_lessons_from_the_longest_study_on_happiness", duration: "13 min", thumbnailUrl: "" },
  { title: "How to Build and Rebuild Trust", description: "Frances Frei explains the three components of trust and how to restore it", creator: "TED", category: "Growth", emoji: "\u{1F91D}", youtubeId: "pVeq-0dIqpk", tedSlug: "frances_frei_how_to_build_and_rebuild_trust", duration: "15 min", thumbnailUrl: "" },
  { title: "Listening to Shame", description: "Brene Brown's follow-up on why shame is an epidemic and how empathy is the antidote", creator: "TED", category: "Connection", emoji: "\u{1F49C}", youtubeId: "psN1DORYYV0", tedSlug: "brene_brown_listening_to_shame", duration: "21 min", thumbnailUrl: "" },
  { title: "The Surprising Science of Happiness", description: "Dan Gilbert reveals how we can synthesise happiness even when things don't go as planned", creator: "TED", category: "Science", emoji: "\u{1F600}", youtubeId: "4q1dgn_C0AU", tedSlug: "dan_gilbert_the_surprising_science_of_happiness", duration: "21 min", thumbnailUrl: "" },
  { title: "How to Stop Screwing Yourself Over", description: "Mel Robbins on the five-second rule and taking action in your relationship and life", creator: "TEDx", category: "Growth", emoji: "\u26A1", youtubeId: "Lp7E973zozc", tedSlug: "", duration: "22 min", thumbnailUrl: "" },
  { title: "Connected, But Alone?", description: "Sherry Turkle on how technology affects our ability to have real conversations with partners", creator: "TED", category: "Communication", emoji: "\u{1F4F1}", youtubeId: "t7Xr3AsBEK4", tedSlug: "sherry_turkle_connected_but_alone", duration: "20 min", thumbnailUrl: "" },
  { title: "Everything You Think You Know About Addiction Is Wrong", description: "Johann Hari reveals that the opposite of addiction isn't sobriety — it's connection", creator: "TED", category: "Connection", emoji: "\u{1F9E0}", youtubeId: "PY9DcIMGxMs", tedSlug: "johann_hari_everything_you_think_you_know_about_addiction_is_wrong", duration: "15 min", thumbnailUrl: "" },
];

const CURATED_QUOTES = [
  { text: "The best thing to hold onto in life is each other.", author: "Audrey Hepburn", category: "Love" },
  { text: "A great relationship is about two things: first, appreciating the similarities, and second, respecting the differences.", author: "Unknown", category: "Growth" },
  { text: "In the end, the love you take is equal to the love you make.", author: "Paul McCartney", category: "Love" },
  { text: "Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.", author: "Lao Tzu", category: "Courage" },
  { text: "The greatest thing you'll ever learn is just to love and be loved in return.", author: "Eden Ahbez", category: "Love" },
  { text: "We loved with a love that was more than love.", author: "Edgar Allan Poe", category: "Passion" },
  { text: "Love does not consist of gazing at each other, but in looking outward together in the same direction.", author: "Antoine de Saint-Exupéry", category: "Partnership" },
  { text: "Whatever our souls are made of, his and mine are the same.", author: "Emily Brontë", category: "Connection" },
  { text: "You know you're in love when you can't fall asleep because reality is finally better than your dreams.", author: "Dr Seuss", category: "Joy" },
  { text: "To love and be loved is to feel the sun from both sides.", author: "David Viscott", category: "Warmth" },
  { text: "The real lover is the man who can thrill you by kissing your forehead.", author: "Marilyn Monroe", category: "Intimacy" },
  { text: "Where there is love there is life.", author: "Mahatma Gandhi", category: "Life" },
  { text: "I have decided to stick with love. Hate is too great a burden to bear.", author: "Martin Luther King Jr.", category: "Choice" },
  { text: "You are my today and all of my tomorrows.", author: "Leo Christopher", category: "Forever" },
  { text: "The couples that are meant to be are the ones who go through everything that is meant to tear them apart and come out even stronger.", author: "Unknown", category: "Resilience" },
  { text: "I love you not because of who you are, but because of who I am when I am with you.", author: "Roy Croft", category: "Love" },
  { text: "The meeting of two personalities is like the contact of two chemical substances: if there is any reaction, both are transformed.", author: "Carl Jung", category: "Growth" },
  { text: "Love recognises no barriers. It jumps hurdles, leaps fences, penetrates walls to arrive at its destination full of hope.", author: "Maya Angelou", category: "Hope" },
  { text: "We are most alive when we are in love.", author: "John Updike", category: "Passion" },
  { text: "A successful marriage requires falling in love many times, always with the same person.", author: "Mignon McLaughlin", category: "Partnership" },
  { text: "The best love is the kind that awakens the soul and makes us reach for more.", author: "Nicholas Sparks", category: "Growth" },
  { text: "To get the full value of joy, you must have someone to divide it with.", author: "Mark Twain", category: "Joy" },
  { text: "Love is not about how many days, months, or years you have been together. It is about how much you love each other every single day.", author: "Unknown", category: "Forever" },
  { text: "In all the world there is no heart for me like yours. In all the world there is no love for you like mine.", author: "Maya Angelou", category: "Connection" },
  { text: "Grow old with me, the best is yet to be.", author: "Robert Browning", category: "Forever" },
  { text: "The secret of a happy marriage is finding the right person. You know they're right if you love to be with them all the time.", author: "Julia Child", category: "Partnership" },
  { text: "Love is composed of a single soul inhabiting two bodies.", author: "Aristotle", category: "Connection" },
  { text: "Happiness is anyone and anything that's loved by you.", author: "Charlie Brown", category: "Joy" },
  { text: "I would rather share one lifetime with you than face all the ages of this world alone.", author: "J.R.R. Tolkien", category: "Forever" },
];

const FALLBACK_PRODUCTS = LUXURY_INTIMACY_PRODUCTS.slice(0, 4);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function registerAiRoutes(app: Express): void {
  // 6. POST /api/generate-feed-content
  app.post("/api/generate-feed-content", async (req: Request, res: Response) => {
    try {
      const { type, description } = req.body;
      const contentType = type || "prompt";

      const systemPrompt = `You are a creative content writer for a couples' relationship app called "Us". 
You create engaging feed content items that appear on users' home screens.

Content types:
- "prompt": Conversation starters or reflection questions for couples
- "tip": Practical relationship advice or gratitude exercises  
- "quiz": Descriptions for interactive quizzes couples can take together
- "article": Short wellness/relationship article teasers
- "challenge": Fun couple challenges or activities

Return ONLY valid JSON with these fields:
{
  "title": "short engaging title (max 50 chars)",
  "subtitle": "brief context line (max 40 chars)",
  "body": "1-2 sentence description (max 150 chars)",
  "emoji": "single relevant emoji",
  "tag": "display tag like Quiz, Prompt, Tip, Challenge, Gratitude, Read \u00B7 Wellness",
  "tag_color": "one of: text-us-gold, text-us-coral, text-us-sage, text-muted-foreground"
}`;

      const userPrompt = description
        ? `Create a "${contentType}" feed item about: ${description}`
        : `Create an engaging "${contentType}" feed item for couples. Be creative and warm.`;

      const data = await callAI([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ], undefined, undefined, await extractUserId(req));

      const raw = data.choices?.[0]?.message?.content || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse AI response as JSON");
      }

      const generated = JSON.parse(jsonMatch[0]);
      res.json(generated);
    } catch (error: any) {
      console.error("Error generating feed content:", error);
      res.status(error.status || 500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // AI content cache: per-user, 2 hours server-side
  const aiContentCache = new Map<string, { data: any; ts: number }>();
  const AI_CACHE_TTL = 2 * 60 * 60 * 1000;
  function getAICache(key: string) {
    const cached = aiContentCache.get(key);
    if (cached && Date.now() - cached.ts < AI_CACHE_TTL) return cached.data;
    return null;
  }
  function setAICache(key: string, data: any) {
    aiContentCache.set(key, { data, ts: Date.now() });
    if (aiContentCache.size > 200) {
      const oldest = [...aiContentCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < 50; i++) aiContentCache.delete(oldest[i][0]);
    }
  }

  // 7. GET /api/suggest-articles
  app.get("/api/suggest-articles", async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    const fallback = () => {
      const shuffled = shuffle(REAL_ARTICLES);
      const categories = new Set<string>();
      const selected: typeof REAL_ARTICLES = [];
      for (const article of shuffled) {
        if (!categories.has(article.category) && selected.length < 7) {
          selected.push(article);
          categories.add(article.category);
        }
      }
      for (const article of shuffled) {
        if (selected.length >= 7) break;
        if (!selected.includes(article)) selected.push(article);
      }
      return selected.slice(0, 7);
    };

    if (!userId || !process.env.OPENAI_API_KEY) {
      return res.json({ articles: fallback() });
    }

    const cacheKey = `articles:${userId}`;
    const cached = getAICache(cacheKey);
    if (cached) return res.json({ articles: cached });

    try {
      const catalog = REAL_ARTICLES.map((a, i) => `${i}: [${a.category}] ${a.title} — ${a.description}`).join("\n");
      const result = await callAI([
        { role: "system", content: `You are a relationship content curator for a couples app called "Us". Given a numbered list of articles about relationships, pick the 7 most relevant for this specific couple based on their context (conversations, moods, preferences, interests). Return ONLY a JSON array of the 7 article index numbers, most relevant first. Example: [3,7,12,0,5,18,9]` },
        { role: "user", content: `Here are the available articles:\n${catalog}\n\nPick the 7 most relevant for this couple.` },
      ], undefined, undefined, userId);

      const content = result.choices?.[0]?.message?.content || "";
      const match = content.match(/\[[\d,\s]+\]/);
      if (match) {
        const indices: number[] = JSON.parse(match[0]);
        const selected = indices.filter(i => i >= 0 && i < REAL_ARTICLES.length).map(i => REAL_ARTICLES[i]).slice(0, 7);
        if (selected.length >= 5) {
          setAICache(cacheKey, selected);
          return res.json({ articles: selected });
        }
      }
      const fb = fallback();
      setAICache(cacheKey, fb);
      res.json({ articles: fb });
    } catch (e) {
      console.error("suggest-articles AI error:", e);
      res.json({ articles: fallback() });
    }
  });

  // 7a-2. GET /api/article-metadata — fetch OG metadata for article URLs
  const ogCache = new Map<string, { ogImage: string; ogTitle: string; ogDescription: string; siteName: string; ts: number }>();

  const isValidExternalUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) return false;
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "[::1]") return false;
      if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".corp")) return false;
      if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|100\.64\.|100\.65\.)/.test(host)) return false;
      if (host === "metadata.google.internal" || host === "169.254.169.254") return false;
      if (host.startsWith("169.254.")) return false;
      const port = parsed.port ? parseInt(parsed.port) : (parsed.protocol === "https:" ? 443 : 80);
      if (![80, 443].includes(port)) return false;
      if (!/\.[a-z]{2,}$/.test(host)) return false;
      return true;
    } catch { return false; }
  };

  app.get("/api/article-metadata", async (req: Request, res: Response) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "url required" });
    if (!isValidExternalUrl(url)) return res.status(400).json({ error: "Invalid URL" });

    const cached = ogCache.get(url);
    if (cached && Date.now() - cached.ts < 86400000) {
      return res.json(cached);
    }

    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; UsApp/1.0)" },
        signal: AbortSignal.timeout(4000),
      });
      if (!resp.ok) {
        const empty = { ogImage: "", ogTitle: "", ogDescription: "", siteName: "", ts: Date.now() };
        ogCache.set(url, empty);
        return res.json(empty);
      }

      const html = await resp.text();

      const getMetaContent = (property: string): string => {
        const patterns = [
          new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
          new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i"),
          new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
          new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, "i"),
        ];
        for (const p of patterns) {
          const m = html.match(p);
          if (m?.[1]) return m[1];
        }
        return "";
      };

      const result = {
        ogImage: getMetaContent("og:image") || getMetaContent("twitter:image"),
        ogTitle: getMetaContent("og:title") || html.match(/<title[^>]*>([^<]+)</i)?.[1]?.trim() || "",
        ogDescription: getMetaContent("og:description") || getMetaContent("description"),
        siteName: getMetaContent("og:site_name") || "",
        ts: Date.now(),
      };

      ogCache.set(url, result);
      res.json(result);
    } catch (e) {
      console.error("article-metadata error:", e);
      const empty = { ogImage: "", ogTitle: "", ogDescription: "", siteName: "", ts: Date.now() };
      ogCache.set(url, empty);
      res.json(empty);
    }
  });

  // 7a-3. GET /api/article-content — extract readable article content
  app.get("/api/article-content", async (req: Request, res: Response) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "url required" });
    if (!isValidExternalUrl(url)) return res.status(400).json({ error: "Invalid URL" });

    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; UsApp/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return res.status(502).json({ error: "Failed to fetch article" });

      const html = await resp.text();

      const getMetaContent = (property: string): string => {
        const patterns = [
          new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
          new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i"),
          new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
        ];
        for (const p of patterns) {
          const m = html.match(p);
          if (m?.[1]) return m[1];
        }
        return "";
      };

      const ogImage = getMetaContent("og:image") || getMetaContent("twitter:image");
      const ogTitle = getMetaContent("og:title") || html.match(/<title[^>]*>([^<]+)</i)?.[1]?.trim() || "";
      const siteName = getMetaContent("og:site_name") || new URL(url).hostname.replace("www.", "");
      const author = getMetaContent("author") || getMetaContent("article:author") || "";

      let bodyHtml = html;
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) bodyHtml = bodyMatch[1];

      bodyHtml = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, "");
      bodyHtml = bodyHtml.replace(/<style[\s\S]*?<\/style>/gi, "");
      bodyHtml = bodyHtml.replace(/<nav[\s\S]*?<\/nav>/gi, "");
      bodyHtml = bodyHtml.replace(/<footer[\s\S]*?<\/footer>/gi, "");
      bodyHtml = bodyHtml.replace(/<header[\s\S]*?<\/header>/gi, "");
      bodyHtml = bodyHtml.replace(/<aside[\s\S]*?<\/aside>/gi, "");
      bodyHtml = bodyHtml.replace(/<form[\s\S]*?<\/form>/gi, "");
      bodyHtml = bodyHtml.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
      bodyHtml = bodyHtml.replace(/<button[\s\S]*?<\/button>/gi, "");
      bodyHtml = bodyHtml.replace(/<!--[\s\S]*?-->/g, "");

      const blocks: string[] = [];
      const tagRx = /<(p|h[1-6]|blockquote|li)[\s>][^]*?<\/\1>/gi;
      let m;
      while ((m = tagRx.exec(bodyHtml)) !== null) {
        let block = m[0];
        block = block.replace(/<(?!\/?(?:p|h[1-6]|blockquote|ul|ol|li|strong|em|b|i|br|img)\b)[^>]+>/gi, "");
        block = block.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*?)["'][^>]*\/?>/gi, (_, src, alt) => {
          let imgSrc = src;
          if (imgSrc.startsWith("/")) { try { imgSrc = new URL(imgSrc, url).href; } catch {} }
          return `<img src="${imgSrc}" alt="${alt}" />`;
        });
        block = block.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, (_, src) => {
          let imgSrc = src;
          if (imgSrc.startsWith("/")) { try { imgSrc = new URL(imgSrc, url).href; } catch {} }
          return `<img src="${imgSrc}" alt="" />`;
        });
        const text = block.replace(/<[^>]+>/g, "").trim();
        if (text.length > 25) blocks.push(block);
      }

      let cleanText = blocks.join("\n");

      res.json({
        title: ogTitle,
        image: ogImage,
        siteName,
        author,
        content: cleanText.substring(0, 50000),
        url,
      });
    } catch (e) {
      console.error("article-content error:", e);
      res.status(502).json({ error: "Failed to extract article content" });
    }
  });

  // 7b. GET /api/curated-podcasts
  const podcastArtworkCache = new Map<string, { url: string; ts: number }>();

  function normalizeForMatch(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  }

  function titleSimilarity(a: string, b: string): number {
    const na = normalizeForMatch(a);
    const nb = normalizeForMatch(b);
    if (na === nb) return 1;
    const wordsA = na.split(" ");
    const wordsB = new Set(nb.split(" "));
    const matches = wordsA.filter(w => wordsB.has(w)).length;
    return matches / Math.max(wordsA.length, wordsB.size);
  }

  async function searchApplePodcast(query: string, expectedHost?: string): Promise<{ appleId: string; title: string; host: string; imageUrl: string; feedUrl: string } | null> {
    const cacheKey = `itunes:${query}`;
    const cached = podcastArtworkCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 7 * 24 * 60 * 60 * 1000) {
      return JSON.parse(cached.url);
    }
    try {
      const resp = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&entity=podcast&limit=5&country=GB`);
      const data = await resp.json() as any;
      const results = data.results || [];
      if (!results.length) return null;

      let best = results[0];
      let bestScore = 0;
      for (const r of results) {
        const name = r.collectionName || r.trackName || "";
        let score = titleSimilarity(query, name);
        if (expectedHost) {
          const hostScore = titleSimilarity(expectedHost, r.artistName || "");
          score = score * 0.7 + hostScore * 0.3;
        }
        if (score > bestScore) {
          bestScore = score;
          best = r;
        }
      }

      if (bestScore < 0.2) return null;

      const found = {
        appleId: String(best.collectionId || best.trackId || ""),
        title: best.collectionName || best.trackName || query,
        host: best.artistName || "",
        imageUrl: best.artworkUrl600 || best.artworkUrl100 || "",
        feedUrl: best.feedUrl || "",
      };
      podcastArtworkCache.set(cacheKey, { url: JSON.stringify(found), ts: Date.now() });
      return found;
    } catch {
      return null;
    }
  }

  async function enrichPodcastArtwork(podcasts: typeof CURATED_PODCASTS) {
    const enriched = await Promise.all(podcasts.map(async (p) => {
      if (p.imageUrl) return p;
      const cached = podcastArtworkCache.get(p.appleId);
      if (cached && Date.now() - cached.ts < 7 * 24 * 60 * 60 * 1000) {
        return { ...p, imageUrl: cached.url };
      }
      try {
        const resp = await fetch(`https://itunes.apple.com/lookup?id=${p.appleId}&entity=podcast`);
        const data = await resp.json() as any;
        const artwork = data.results?.[0]?.artworkUrl600 || data.results?.[0]?.artworkUrl100 || "";
        if (artwork) podcastArtworkCache.set(p.appleId, { url: artwork, ts: Date.now() });
        return { ...p, imageUrl: artwork };
      } catch {
        return p;
      }
    }));
    return enriched;
  }

  app.get("/api/curated-podcasts", async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    const enriched = await enrichPodcastArtwork(CURATED_PODCASTS).catch(() => CURATED_PODCASTS);
    const fallbackResult = shuffle(enriched).slice(0, 6);

    if (!userId || !process.env.OPENAI_API_KEY) {
      return res.json({ podcasts: fallbackResult });
    }

    const cacheKey = `podcasts:v4:${userId}`;
    const cached = getAICache(cacheKey);
    if (cached) return res.json({ podcasts: cached });

    try {
      const knownCatalog = enriched.map((p, i) => `${i}: "${p.title}" by ${p.host} [${p.category}] — ${p.description}`).join("\n");

      const result = await callAI([
        {
          role: "system",
          content: `You are a podcast curator for a couples/relationship app called "Us". Your job is to recommend the best podcasts for this couple to listen to together — shows they can play right now in the app.

STEP 1: Pick up to 4 from the known catalog below (by index number) that best match the couple's interests and current mood.
STEP 2: Suggest up to 6 NEW podcast shows (not in the catalog) that would be perfect for this couple. These must be REAL podcasts available on Apple Podcasts. Think broadly — relationship podcasts, wellness, intimacy, communication, cooking together, travel, parenting if relevant, personal growth, mindfulness, humor, true crime, music, culture, or any topic that matches their interests and activity in the app.

Be creative with new suggestions. Go beyond just "relationship advice" podcasts — if they like date nights, suggest food/restaurant podcasts. If they're into wellness, suggest meditation or fitness pods. If they chat about travel, suggest travel shows. Match their actual interests.

Known catalog:
${knownCatalog}

Return a JSON object with:
- "fromCatalog": array of index numbers (up to 4)
- "newPodcasts": array of objects with { "searchQuery": "exact real podcast name to search on Apple Podcasts", "title": "display title", "host": "host name", "description": "1 sentence description for the couple", "category": "category", "duration": "typical episode length" }

IMPORTANT: For newPodcasts, use the EXACT real podcast name as searchQuery so it can be found on Apple Podcasts. Only suggest shows you are confident actually exist and are currently active.`,
        },
        { role: "user", content: "What podcasts should this couple listen to?" },
      ], [
        {
          type: "function",
          function: {
            name: "recommend_podcasts",
            description: "Recommend podcasts from catalog and new Apple Podcasts discoveries",
            parameters: {
              type: "object",
              properties: {
                fromCatalog: { type: "array", items: { type: "number" } },
                newPodcasts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      searchQuery: { type: "string" },
                      title: { type: "string" },
                      host: { type: "string" },
                      description: { type: "string" },
                      category: { type: "string" },
                      duration: { type: "string" },
                    },
                    required: ["searchQuery", "title", "host", "description", "category", "duration"],
                  },
                },
              },
              required: ["fromCatalog", "newPodcasts"],
              additionalProperties: false,
            },
          },
        },
      ], { type: "function", function: { name: "recommend_podcasts" } }, userId);

      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        setAICache(cacheKey, fallbackResult);
        return res.json({ podcasts: fallbackResult });
      }

      const rec = JSON.parse(toolCall.function.arguments);
      const finalPodcasts: any[] = [];

      const catalogPicks = (rec.fromCatalog || [])
        .filter((i: number) => typeof i === "number" && i >= 0 && i < enriched.length)
        .slice(0, 4)
        .map((i: number) => enriched[i]);
      finalPodcasts.push(...catalogPicks);

      const newPodcasts = (rec.newPodcasts || []).slice(0, 6);
      const appleSearches = await Promise.all(
        newPodcasts.map(async (np: any) => {
          const found = await searchApplePodcast(np.searchQuery, np.host);
          if (found && found.appleId) {
            return {
              title: found.title || np.title,
              description: np.description,
              host: found.host || np.host,
              category: np.category,
              spotifyId: "",
              appleId: found.appleId,
              imageUrl: found.imageUrl || "",
              duration: np.duration,
            };
          }
          return null;
        })
      );
      finalPodcasts.push(...appleSearches.filter(Boolean));

      const deduped = finalPodcasts.filter((p, i, arr) =>
        arr.findIndex(x => x.appleId === p.appleId) === i
      ).slice(0, 10);

      if (deduped.length >= 3) {
        setAICache(cacheKey, deduped);
        return res.json({ podcasts: deduped });
      }

      setAICache(cacheKey, fallbackResult);
      res.json({ podcasts: fallbackResult });
    } catch (e) {
      console.error("curated-podcasts AI error:", e);
      res.json({ podcasts: fallbackResult });
    }
  });

  // 7c. GET /api/curated-videos
  app.get("/api/curated-videos", async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    const fallbackResult = shuffle(CURATED_VIDEOS).slice(0, 6);

    if (!userId || !process.env.OPENAI_API_KEY) {
      return res.json({ videos: fallbackResult });
    }

    const cacheKey = `videos:${userId}`;
    const cached = getAICache(cacheKey);
    if (cached) return res.json({ videos: cached });

    try {
      const catalog = CURATED_VIDEOS.map((v, i) => `${i}: [${v.category}] "${v.title}" by ${v.creator} — ${v.description}`).join("\n");
      const result = await callAI([
        { role: "system", content: `You are a relationship content curator for a couples app called "Us". Given a numbered list of relationship videos, pick the 6 most relevant for this specific couple based on their context. Return ONLY a JSON array of 6 index numbers, most relevant first. Example: [1,4,0,7,2,9]` },
        { role: "user", content: `Here are the available videos:\n${catalog}\n\nPick the 6 most relevant for this couple.` },
      ], undefined, undefined, userId);

      const content = result.choices?.[0]?.message?.content || "";
      const match = content.match(/\[[\d,\s]+\]/);
      if (match) {
        const indices: number[] = JSON.parse(match[0]);
        const selected = indices.filter(i => i >= 0 && i < CURATED_VIDEOS.length).map(i => CURATED_VIDEOS[i]).slice(0, 6);
        if (selected.length >= 4) {
          setAICache(cacheKey, selected);
          return res.json({ videos: selected });
        }
      }
      setAICache(cacheKey, fallbackResult);
      res.json({ videos: fallbackResult });
    } catch (e) {
      console.error("curated-videos AI error:", e);
      res.json({ videos: fallbackResult });
    }
  });

  // 7d. GET /api/curated-quotes
  app.get("/api/curated-quotes", async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    const fallbackResult = shuffle(CURATED_QUOTES).slice(0, 5);

    if (!userId || !process.env.OPENAI_API_KEY) {
      return res.json({ quotes: fallbackResult });
    }

    const cacheKey = `quotes:${userId}`;
    const cached = getAICache(cacheKey);
    if (cached) return res.json({ quotes: cached });

    try {
      const result = await callAI([
        { role: "system", content: `You are a poetic, warm quote writer for a couples app called "Us". Based on this couple's context (their conversations, moods, interests), generate 5 inspiring, romantic or thoughtful quotes about love and relationships. Make them feel personal and relevant to what this couple is going through. Mix original quotes with well-known ones that fit their situation. Return a JSON array of objects with "text", "author", and "category" fields. For original quotes, use "Us" as the author.` },
        { role: "user", content: "Generate 5 personalised relationship quotes for this couple." },
      ], undefined, undefined, userId);

      const content = result.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const quotes = JSON.parse(jsonMatch[0]);
        if (Array.isArray(quotes) && quotes.length >= 3) {
          setAICache(cacheKey, quotes.slice(0, 5));
          return res.json({ quotes: quotes.slice(0, 5) });
        }
      }
      setAICache(cacheKey, fallbackResult);
      res.json({ quotes: fallbackResult });
    } catch (e) {
      console.error("curated-quotes AI error:", e);
      res.json({ quotes: fallbackResult });
    }
  });

  // 8. POST /api/suggest-dreams
  app.post("/api/suggest-dreams", async (req: Request, res: Response) => {
    try {
      const { existingDreams = [], existingLists = [] } = req.body;

      const context = existingLists.length > 0
        ? `The couple already has these lists/interests: ${existingLists.join(", ")}. `
        : "";
      const existing = existingDreams.length > 0
        ? `They already have these dreams: ${existingDreams.join(", ")}. Suggest different ones.`
        : "";

      const data = await callAI(
        [
          {
            role: "system",
            content: "You are a relationship coach helping a couple identify their top long-term dreams together. Return exactly 5 inspiring, specific, actionable couple dreams. Mix practical life goals with aspirational experiences.",
          },
          {
            role: "user",
            content: `Suggest 5 long-term dreams for a couple. ${context}${existing}`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "suggest_dreams",
              description: "Return exactly 5 long-term couple dream suggestions",
              parameters: {
                type: "object",
                properties: {
                  dreams: {
                    type: "array",
                    items: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
                    minItems: 5,
                    maxItems: 5,
                  },
                },
                required: ["dreams"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "suggest_dreams" } },
        await extractUserId(req)
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");

      const parsed = JSON.parse(toolCall.function.arguments);
      res.json(parsed);
    } catch (e: any) {
      console.error("suggest-dreams error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // 9. POST /api/suggest-experiences
  app.post("/api/suggest-experiences", async (req: Request, res: Response) => {
    try {
      try { req.body; } catch {}

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a date night gift recommender for couples. Suggest 4 romantic date night experience gifts or vouchers available on Amazon UK (gift vouchers, experience boxes, date night kits, spa day gift sets, cocktail kits, restaurant voucher cards, cooking class kits, cinema gift sets).
You MUST suggest REAL, SPECIFIC products that actually exist on Amazon UK. Use the exact brand name and full product title.
For asin: provide the real Amazon UK ASIN (the 10-character code starting with B, e.g. "B07MX6212N"). This MUST be a real ASIN for the exact product. If you are not sure of the ASIN, leave it empty.
Keep descriptions under 60 chars.`,
          },
          {
            role: "user",
            content: `Suggest 4 romantic date night experience gifts or vouchers for couples on Amazon UK. Varied mix (spa, dining, cocktails, adventure). Return only valid JSON.`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "suggest_experiences",
              description: "Return 4 date night experience gift suggestions",
              parameters: {
                type: "object",
                properties: {
                  experiences: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        venue: { type: "string" },
                        price: { type: "string" },
                        description: { type: "string" },
                        category: { type: "string", enum: ["Restaurant", "Bar", "Activity", "Spa", "Theatre", "Class", "Outdoor"] },
                        emoji: { type: "string" },
                        city: { type: "string" },
                        asin: { type: "string", description: "Amazon UK ASIN (10-char code starting with B)" },
                        duration: { type: "string" },
                      },
                      required: ["name", "venue", "price", "description", "category", "emoji", "city", "asin", "duration"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["experiences"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "suggest_experiences" } },
        await extractUserId(req)
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let experiences;
      if (toolCall?.function?.arguments) {
        experiences = JSON.parse(toolCall.function.arguments).experiences;
      } else {
        const content = data.choices?.[0]?.message?.content || "[]";
        try {
          experiences = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
        } catch { experiences = []; }
      }

      if (!experiences || experiences.length === 0) {
        experiences = [
          { name: "Buyagift Spa Day for Two Gift Experience", venue: "Amazon UK", price: "\u00A349.99", description: "Luxury couples spa day voucher", category: "Spa", emoji: "\u{1F6C1}", city: "UK", asin: "B00HROQKRC", duration: "Full day" },
          { name: "VonShef Cocktail Making Set Parisian", venue: "Amazon UK", price: "\u00A329.99", description: "Make craft cocktails together at home", category: "Class", emoji: "\u{1F379}", city: "UK", asin: "B07MX6212N", duration: "2 hours" },
          { name: "Buyagift Dinner for Two Gift Experience", venue: "Amazon UK", price: "\u00A349.99", description: "Voucher for a luxury couples dinner", category: "Restaurant", emoji: "\u{1F37D}\uFE0F", city: "UK", asin: "B00HROQK7A", duration: "3 hours" },
          { name: "Virgin Experience Days Adventure for Two", venue: "Amazon UK", price: "\u00A359.99", description: "Thrilling couples adventure day out", category: "Activity", emoji: "\u{1F3AF}", city: "UK", asin: "B07WGJLZ8T", duration: "Full day" },
        ];
      }

      experiences = experiences.map((e: any) => ({
        ...e,
        bookingUrl: buildAmazonUrl(e.name),
      }));

      res.json({ experiences });
    } catch (e: any) {
      console.error("suggest-experiences error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // 10. POST /api/suggest-family-tasks
  app.post("/api/suggest-family-tasks", async (req: Request, res: Response) => {
    try {
      const { parents = [], children = [], categories = [] } = req.body;

      const familyDesc = [
        ...parents.map((p: { name: string }) => `${p.name} (parent)`),
        ...children.map((c: { name: string; age: string }) => `${c.name} (child, age ${c.age || "unknown"})`),
      ].join(", ");

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a family organiser helping a couple manage their family tasks. Generate practical, specific, actionable to-do items for each category requested. For per-child tasks, create items specific to each child's name and age (e.g. school-related for older kids, developmental for toddlers). Keep items concise (under 12 words). Generate 2-4 items per category, more for "Per-child tasks" (2-3 per child).`,
          },
          {
            role: "user",
            content: `Family members: ${familyDesc}. Generate tasks for these categories: ${categories.join(", ")}`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "generate_family_tasks",
              description: "Return categorised family tasks",
              parameters: {
                type: "object",
                properties: {
                  categories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", description: "Category name, for children use their name as category" },
                        tasks: { type: "array", items: { type: "string" } },
                      },
                      required: ["category", "tasks"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["categories"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "generate_family_tasks" } },
        await extractUserId(req)
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");

      const parsed = JSON.parse(toolCall.function.arguments);
      res.json(parsed);
    } catch (e: any) {
      console.error("suggest-family-tasks error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // 11. POST /api/suggest-intimacy
  app.post("/api/suggest-intimacy", async (req: Request, res: Response) => {
    try {
      try { req.body; } catch {}

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a product recommender for a couples wellness app. Suggest 2 romantic and intimate products available on Amazon UK.
Include: couples card games, bath sets, massage oils, scented candles, vibrators, sensual gift sets.
Use exact brand names and real product titles. Keep descriptions under 60 chars. Leave productUrl empty.`,
          },
          {
            role: "user",
            content: `Suggest 2 couples intimate/romantic products from Amazon UK. Mix categories (e.g. one game/accessory and one wellness/sensual item).`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "suggest_intimacy",
              description: "Return 2 couples intimacy product suggestions from Amazon UK",
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
                        productUrl: { type: "string", description: "Full product URL for Coco de Mer items (e.g. https://www.coco-de-mer.com/products/...). Leave empty for Amazon products." },
                        imageSearchTerm: { type: "string" },
                      },
                      required: ["name", "brand", "price", "description", "category", "emoji", "productUrl", "imageSearchTerm"],
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
        { type: "function", function: { name: "suggest_intimacy" } },
        await extractUserId(req)
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let aiProducts: any[] = [];
      if (toolCall?.function?.arguments) {
        aiProducts = JSON.parse(toolCall.function.arguments).products || [];
      }

      const cdmPicks = shuffle(LUXURY_INTIMACY_PRODUCTS).slice(0, 2);
      let amazonItems = aiProducts.filter((p: any) => !p.productUrl?.includes("coco-de-mer.com") && !p.productUrl?.includes("agentprovocateur.com") && !p.productUrl?.includes("goop.com")).slice(0, 2);
      if (amazonItems.length < 2) {
        amazonItems = [
          ...amazonItems,
          { name: "Couples Intimacy Card Game", brand: "Lovehoney", price: "\u00A314.99", description: "50 fun dares and questions for couples", category: "Games", emoji: "\u{1F0CF}", imageSearchTerm: "couples intimacy card game" },
          { name: "Couples Massage Candle", brand: "Jimmyjane", price: "\u00A328.00", description: "Melts into warm massage oil", category: "Candles", emoji: "\u{1F56F}\uFE0F", imageSearchTerm: "massage candle couples" },
        ].slice(0, 2 - amazonItems.length);
      }
      const mixed = shuffle([...cdmPicks, ...amazonItems]);

      const enriched = await Promise.all(mixed.map(async (p: any) => {
        const searchTerm = p.imageSearchTerm || `${p.name} ${p.brand}`;
        const imageUrl = await fetchAmazonProductImage(searchTerm);
        const isLuxuryBrand = p.productUrl && (p.productUrl.includes("coco-de-mer.com") || p.productUrl.includes("agentprovocateur.com") || p.productUrl.includes("goop.com") || p.productUrl.includes("sophieolivia") || p.productUrl.includes("spacenk.com") || p.productUrl.includes("lelo.com") || p.productUrl.includes("lovehoney.co.uk"));
        const url = isLuxuryBrand ? p.productUrl : buildAmazonUrl(p.name);
        return { ...p, productUrl: url, affiliateTag: AMAZON_TAG, imageUrl };
      }));

      res.json({ products: enriched });
    } catch (e: any) {
      console.error("suggest-intimacy error:", e);
      res.json({ products: FALLBACK_PRODUCTS });
    }
  });

  // 12. POST /api/suggest-products
  app.post("/api/suggest-products", async (req: Request, res: Response) => {
    try {
      const { category } = req.body || { category: "general" };

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a product recommendation engine for a couples/relationship app.
Suggest 4 SPECIFIC, REAL products that actually exist on Amazon UK. Use exact product names and real brands.
For asin: provide the real Amazon UK ASIN (10-character code starting with B, e.g. "B07MX6212N"). This MUST be a real ASIN. If unsure, leave empty.
Use realistic GBP prices, short descriptions (max 60 chars).
For imageKeyword: provide a single concrete noun for an Unsplash photo (e.g. "candles", "wine", "map", "massage oil", "board game").
Category must be one of: Date Night, Wellness, Travel, Intimacy, Experiences, Games, Home, Books, Stationery, Dining.`,
          },
          {
            role: "user",
            content: `Suggest 4 specific real Amazon UK products for couples. Category hint: ${category}. Use real brand names and full product titles. Make them varied and gift-worthy.`,
          },
        ],
        [
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
                        asin: { type: "string", description: "Amazon UK ASIN (10-char code starting with B)" },
                        imageKeyword: { type: "string", description: "Simple noun/phrase for Unsplash photo" },
                      },
                      required: ["name", "brand", "price", "description", "category", "emoji", "asin", "imageKeyword"],
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
        { type: "function", function: { name: "suggest_products" } },
        await extractUserId(req)
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let products;
      if (toolCall?.function?.arguments) {
        products = JSON.parse(toolCall.function.arguments).products;
      } else {
        throw new Error("No tool call response from AI");
      }

      const enriched = (products || []).map((p: any) => ({
        ...p,
        productUrl: buildAmazonUrl(p.name),
        affiliateTag: AMAZON_TAG,
      }));
      res.json({ products: enriched });
    } catch (e: any) {
      console.error("suggest-products error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // 13. POST /api/suggest-tasks
  app.post("/api/suggest-tasks", async (req: Request, res: Response) => {
    try {
      const { existingItems = [], listName = "Daily To-Do" } = req.body;

      const existing = existingItems.length > 0
        ? `They already have these items: ${existingItems.join(", ")}. Suggest different ones that complement what they already have.`
        : "";

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a relationship coach helping a couple with their shared lists. Based on the list name and context, suggest relevant, meaningful items that strengthen their bond. Keep items short and actionable (under 12 words each). Match the tone and theme of the list \u2014 if it's about intimacy, suggest intimacy items; if it's about challenges, suggest challenge-related items; if it's about dreams, suggest aspirational dreams; if it's about communication, suggest communication practices. Be creative and specific, not generic.`,
          },
          {
            role: "user",
            content: `Suggest 5 items for a couple's "${listName}" list. ${existing}`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "suggest_tasks",
              description: "Return exactly 5 list item suggestions relevant to the list theme",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
                    minItems: 5,
                    maxItems: 5,
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "suggest_tasks" } },
        await extractUserId(req)
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");

      const parsed = JSON.parse(toolCall.function.arguments);
      res.json(parsed);
    } catch (e: any) {
      console.error("suggest-tasks error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // 14. POST /api/suggest-travel
  app.post("/api/suggest-travel", async (req: Request, res: Response) => {
    try {
      try { req.body; } catch {}

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a couples travel recommender. Suggest 4 romantic UK/Europe weekend getaways or travel experiences.
Mix city breaks (Paris, Rome, Edinburgh, Amsterdam), coastal retreats, countryside escapes, and spa weekends.
Include realistic price-per-couple estimates.
For bookingUrl use this exact format with the destination encoded: "https://www.booking.com/searchresults.html?ss=DESTINATION&aid=356980&affiliate_id=7540258"
Example: "https://www.booking.com/searchresults.html?ss=Paris%2C+France&aid=356980&affiliate_id=7540258"
Keep descriptions under 60 chars. Return valid JSON array only.`,
          },
          {
            role: "user",
            content: `Suggest 4 romantic couple travel getaways departing from the UK. Return only the JSON array.`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "suggest_travel",
              description: "Return 4 couples travel suggestions",
              parameters: {
                type: "object",
                properties: {
                  destinations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        destination: { type: "string" },
                        country: { type: "string" },
                        price: { type: "string" },
                        description: { type: "string" },
                        category: { type: "string", enum: ["City Break", "Beach", "Countryside", "Spa", "Adventure", "Cultural"] },
                        emoji: { type: "string" },
                        duration: { type: "string" },
                        bookingUrl: { type: "string" },
                      },
                      required: ["name", "destination", "country", "price", "description", "category", "emoji", "duration", "bookingUrl"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["destinations"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "suggest_travel" } },
        await extractUserId(req)
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let destinations;
      if (toolCall?.function?.arguments) {
        destinations = JSON.parse(toolCall.function.arguments).destinations;
      } else {
        const content = data.choices?.[0]?.message?.content || "[]";
        destinations = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      }

      res.json({ destinations });
    } catch (e: any) {
      console.error("suggest-travel error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  app.post("/api/ai-search", async (req: Request, res: Response) => {
    try {
      const { query, section } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "query is required" });
      }

      const sectionContext = section === "discover"
        ? `You are a shopping & experience advisor for couples.
Return a JSON object with an "items" array of 4-6 results.
Each item MUST have: name (string), description (string, 1-2 sentences), category (string), emoji (string), type (one of "product","experience","travel").
For products also include: price (string like "£29.99"), brand (string), asin (the 10-character Amazon UK ASIN starting with B — must be real; leave empty if unsure).
For experiences also include: price (string), venue (string), city (string), duration (string), asin (Amazon UK ASIN if the experience is sold on Amazon, empty otherwise).
For travel also include: destination (string), country (string), price (string), duration (string).
Focus on items available to buy on Amazon UK or experiences in the UK. Use REAL product ASINs from Amazon UK.`
        : `You are a relationship media curator.
Return a JSON object with an "items" array of 4-6 results.
Each item MUST have: name (string), description (string, 1-2 sentences), category (string), emoji (string), type (one of "article","podcast","video","quote").
For articles include: url (a real, working URL to the article), source (string).
For podcasts include: applePodcastsName (string, the podcast show name to search on Apple Podcasts), host (string).
For videos include: youtubeSearchQuery (string to find it on YouTube), creator (string), duration (string).
For quotes include: text (the full quote text), author (string).
Focus on real, existing content about relationships, dating, couples, love, and communication.`;

      const messages = [
        { role: "system", content: `${sectionContext}\nOnly return valid JSON. No markdown, no code fences.` },
        { role: "user", content: query },
      ];

      const result = await callAI(messages, undefined, undefined, await extractUserId(req));
      const content = result.choices?.[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      const items = (parsed.items || []).map((item: any) => {
        if ((item.type === "product" || item.type === "experience") && item.name) {
          item.amazonSearchUrl = buildAmazonUrl(item.name);
        }
        return item;
      });

      res.json({ items });
    } catch (e: any) {
      console.error("AI search error:", e.message);
      if (e.status === 429) return res.status(429).json({ error: "Rate limited, try again shortly" });
      res.status(500).json({ error: "AI search failed" });
    }
  });
}
