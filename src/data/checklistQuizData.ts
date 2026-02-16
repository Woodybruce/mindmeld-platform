export interface ChecklistSection {
  title: string;
  /** If set, this section only shows for the specified gender selection */
  forGender?: "women" | "men";
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  type: "checkbox" | "rating" | "choice" | "fill";
  choices?: string[];
}

export interface ChecklistQuizDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  duration: string;
  gradient: string;
  /** Whether participants pick a gender-role perspective first */
  hasGenderPerspective: boolean;
  sections: ChecklistSection[];
}

export const checklistQuizzes: ChecklistQuizDefinition[] = [
  {
    id: "together-list",
    title: "Our Together List",
    description: "Prioritise what matters, pick activities, and plan trips you both want to do.",
    emoji: "💑",
    duration: "5 min",
    gradient: "bg-gradient-to-br from-us-sage/20 to-us-gold/20",
    hasGenderPerspective: false,
    sections: [
      {
        title: "Our Top Priorities",
        items: [
          { id: "top-datenight", text: "Date night every week", type: "checkbox" },
          { id: "top-getaway", text: "Go away once every month together", type: "checkbox" },
          { id: "top-custom1", text: "Cook a new recipe together weekly", type: "checkbox" },
          { id: "top-custom2", text: "Have a daily check-in conversation", type: "checkbox" },
          { id: "top-custom3", text: "Exercise or walk together regularly", type: "checkbox" },
        ],
      },
      {
        title: "Things We'd Like to Do Together",
        items: [
          { id: "act-dancing", text: "Dancing", type: "checkbox" },
          { id: "act-show", text: "Go see an act", type: "checkbox" },
          { id: "act-paint", text: "Paint / draw each other", type: "checkbox" },
          { id: "act-pottery", text: "Pottery class together", type: "checkbox" },
          { id: "act-gallery", text: "Go to 2 art Galleries", type: "checkbox" },
          { id: "act-concert", text: "Attend a live concert", type: "checkbox" },
          { id: "act-wine", text: "Wine or cocktail tasting", type: "checkbox" },
          { id: "act-spa", text: "Couples spa day", type: "checkbox" },
          { id: "act-volunteer", text: "Volunteer together", type: "checkbox" },
          { id: "act-stargazing", text: "Go stargazing", type: "checkbox" },
        ],
      },
      {
        title: "Trips We Want to Do",
        items: [
          { id: "trip-scottish-lakes", text: "Scottish Lakes", type: "checkbox" },
          { id: "trip-amalfi", text: "Amalfi coast", type: "checkbox" },
          { id: "trip-colondor", text: "Colondor hotel", type: "checkbox" },
          { id: "trip-amsterdam", text: "Amsterdam", type: "checkbox" },
          { id: "trip-scotland-lake", text: "Scotland lake house", type: "checkbox" },
          { id: "trip-comporta", text: "Comporta Portugal", type: "checkbox" },
          { id: "trip-paris", text: "Paris weekend", type: "checkbox" },
          { id: "trip-iceland", text: "Iceland Northern Lights", type: "checkbox" },
          { id: "trip-japan", text: "Japan", type: "checkbox" },
        ],
      },
    ],
  },
  {
    id: "sex-bucket-list",
    title: "Sex Bucket List",
    description: "Explore desires, rate satisfaction, and discover what you both want to try.",
    emoji: "🔥",
    duration: "10 min",
    gradient: "bg-gradient-to-br from-us-coral/20 to-us-blush/30",
    hasGenderPerspective: true,
    sections: [
      {
        title: "Quick Snapshot",
        items: [
          { id: "snap-satisfaction", text: "Satisfaction rating (1–10)", type: "rating" },
          { id: "snap-skills", text: "Skills rating (1–10)", type: "rating" },
          { id: "snap-trend", text: "Trend", type: "choice", choices: ["Better", "Worse", "Same"] },
          { id: "snap-frequency", text: "Avg. times per month (solo or partnered)", type: "rating" },
        ],
      },
      {
        title: "Libido & Confidence",
        items: [
          { id: "libido-mine", text: "My libido level (1–10)", type: "rating" },
          { id: "libido-partner", text: "Partner's libido level (1–10)", type: "rating" },
          { id: "libido-confident", text: "I feel confident I can bring my partner to orgasm", type: "checkbox" },
          { id: "libido-improve", text: "I'd like to improve my sexual confidence/stamina", type: "checkbox" },
        ],
      },
      {
        title: "Pleasure & Orgasms",
        forGender: "men",
        items: [
          { id: "pleasure-stamina", text: "I want more stamina / longer-lasting sex", type: "checkbox" },
          { id: "pleasure-penile", text: "Penile orgasm", type: "checkbox" },
          { id: "pleasure-prostate", text: "Prostate (P-spot) orgasm", type: "checkbox" },
          { id: "pleasure-blended", text: "Blended P-spot + penile orgasm", type: "checkbox" },
          { id: "pleasure-urethral", text: "Urethral orgasm", type: "checkbox" },
        ],
      },
      {
        title: "Mind / Fantasy / Play",
        items: [
          { id: "mind-hypnosis", text: "Erotic hypnosis", type: "checkbox" },
          { id: "mind-roleplay", text: "Fantasy / roleplay", type: "checkbox" },
          { id: "mind-sensation", text: "Sensation play (spanking, feathers, electro-stim etc.)", type: "checkbox" },
          { id: "mind-dominance", text: "Dominance / submission / rougher play", type: "checkbox" },
        ],
      },
      {
        title: "Toys & Tools",
        items: [
          { id: "toys-vibrator", text: "Vibrators (bullet / wand)", type: "checkbox" },
          { id: "toys-air", text: "Air stimulator", type: "checkbox" },
          { id: "toys-licker", text: "Licker toy", type: "checkbox" },
          { id: "toys-thruster", text: "Thruster / pulsator", type: "checkbox" },
        ],
      },
      {
        title: "Intimacy & Connection Practices",
        items: [
          { id: "intimacy-solo", text: "Regular solo pleasure practice", type: "checkbox" },
          { id: "intimacy-massage", text: "Sensual massage (incl breast massage)", type: "checkbox" },
          { id: "intimacy-petting", text: "Petting / stroking / hair play", type: "checkbox" },
          { id: "intimacy-kissing", text: "More erotic kissing / making out", type: "checkbox" },
          { id: "intimacy-neck", text: "Neck/ear play (breath, licking, sucking)", type: "checkbox" },
          { id: "intimacy-holding", text: "Longer sensual holding moments", type: "checkbox" },
        ],
      },
      {
        title: "Skills & Techniques",
        items: [
          { id: "skills-manual", text: "Manual genital massage skills", type: "checkbox" },
          { id: "skills-oral", text: "Improve oral techniques", type: "checkbox" },
          { id: "skills-oral-orgasm", text: "Learn to orgasm while receiving oral", type: "checkbox" },
          { id: "skills-69", text: "Explore mutual oral ('69')", type: "checkbox" },
          { id: "skills-positions", text: "Explore positions stimulating multiple zones", type: "checkbox" },
        ],
      },
      {
        title: "Novelty, Talk & Confidence",
        items: [
          { id: "novelty-locations", text: "Sex in new/unusual locations", type: "checkbox" },
          { id: "novelty-talk", text: "More sensual talk / dirty talk", type: "checkbox" },
          { id: "novelty-fantasies", text: "Share fantasies (even if not acted on)", type: "checkbox" },
          { id: "novelty-moans", text: "More moans / feedback / vocal response", type: "checkbox" },
          { id: "novelty-ask", text: "Feel confident asking for what I want", type: "checkbox" },
          { id: "novelty-partner-ask", text: "Encourage partner to ask too", type: "checkbox" },
          { id: "novelty-frames", text: "Share 'favorite frames' (best moments)", type: "checkbox" },
        ],
      },
      {
        title: "Dressing Up / Media",
        items: [
          { id: "dress-lingerie", text: "Sexy clothes / lingerie / costumes", type: "checkbox" },
          { id: "dress-photos", text: "Take sexy photos or video", type: "checkbox" },
        ],
      },
      {
        title: "Clubs / Dance / Water Play",
        items: [
          { id: "club-dance", text: "Erotic dance / lap dance / pole dance with partner", type: "checkbox" },
          { id: "club-exotic", text: "Go to an exotic dance club", type: "checkbox" },
          { id: "club-water", text: "Water play (hot tub / shower / spring / waterfall)", type: "checkbox" },
        ],
      },
      {
        title: "Kink / BDSM Exploration",
        items: [
          { id: "kink-spanking", text: "Spanking / flogging / restraints / blindfolds", type: "checkbox" },
          { id: "kink-rope", text: "Rope bondage (Shibari)", type: "checkbox" },
          { id: "kink-furniture", text: "Sex furniture restraint play", type: "checkbox" },
          { id: "kink-domination", text: "Domination / being dominated", type: "checkbox" },
          { id: "kink-harness", text: "Harness / strap-on play", type: "checkbox" },
          { id: "kink-remote", text: "Remote control toy play", type: "checkbox" },
        ],
      },
      {
        title: "Anal / Pumps / Enhancement",
        items: [
          { id: "anal-explore", text: "Explore anal pleasure", type: "checkbox" },
          { id: "anal-suction", text: "Suction devices (clit/nipple/penis/vulva pump)", type: "checkbox" },
          { id: "anal-pump", text: "Penis pump / enlargement techniques", type: "checkbox" },
        ],
      },
      {
        title: "Tantra / Spiritual / Expanded Orgasm",
        items: [
          { id: "tantra-techniques", text: "Tantra / spiritual sex techniques", type: "checkbox" },
          { id: "tantra-expanded", text: "Expanded orgasm / orgasmic meditation", type: "checkbox" },
          { id: "tantra-multi", text: "Multi-orgasmic stamina training", type: "checkbox" },
          { id: "tantra-ejaculation", text: "Female ejaculation healing / exploration", type: "checkbox" },
          { id: "tantra-thrusting", text: "Taoist thrusting techniques", type: "checkbox" },
          { id: "tantra-360", text: "360° tantric positions", type: "checkbox" },
          { id: "tantra-piercings", text: "Piercings / clamps / jewelry", type: "checkbox" },
        ],
      },
    ],
  },
];
