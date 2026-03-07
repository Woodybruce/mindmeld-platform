export interface ProductData {
  name: string;
  brand: string;
  price: string;
  description: string;
  longDescription: string;
  features: string[];
  category: string;
  imageKeyword?: string;
  imageUrl: string | null;
  images: string[];
  productUrl: string;
  sizing?: {
    type: string;
    options: string[];
    guide?: string;
  };
  materials?: string;
  dimensions?: string;
  whatsIncluded?: string[];
  careInstructions?: string;
}

export const LUXURY_INTIMACY_PRODUCTS: ProductData[] = [
  {
    name: "Roseravished Massage Oil",
    brand: "Coco de Mer",
    price: "£54.00",
    description: "Luxurious rose-scented sensual massage oil with neroli and ylang ylang",
    longDescription: "A sumptuous blend of natural oils infused with Damascus rose, neroli and ylang ylang. Designed to warm between the palms and melt into skin, creating an intoxicating aromatic experience for couples.",
    features: ["100ml hand-poured oil", "Damascus rose & neroli blend", "Warms between palms", "Vegan & cruelty-free"],
    category: "Massage",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Roseravished-Massage-Oil_1024x.png?v=1752055199",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Roseravished-Massage-Oil_1024x.png?v=1752055199",
      "https://www.coco-de-mer.com/cdn/shop/products/Coco_de_Mer_Massage_Oil_lifestyle_1024x.png?v=1752055199",
      "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Roseravished-Massage-Oil-detail_1024x.png?v=1752055199"
    ],
    productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-roseravished-massage-oil-100ml",
    sizing: { type: "volume", options: ["100ml"], guide: "One bottle provides approximately 8-10 full body massage sessions" },
    materials: "Sweet almond oil, jojoba oil, Damascus rose essential oil, neroli oil, ylang ylang oil, vitamin E",
    dimensions: "100ml glass bottle — 15cm × 5cm",
    whatsIncluded: ["100ml Roseravished Massage Oil", "Gift box"],
    careInstructions: "Store in a cool, dry place away from direct sunlight. Use within 12 months of opening."
  },
  {
    name: "Enraptured Figment Massage Candle",
    brand: "Coco de Mer",
    price: "£60.00",
    description: "Hand-poured candle that melts into warm, fragrant massage oil",
    longDescription: "This exquisite candle fills the room with an intoxicating scent before melting into a pool of warm, skin-nourishing massage oil. Crafted with shea butter and coconut oil for a truly indulgent experience.",
    features: ["200g soy wax blend", "Melts into massage oil", "Shea butter & coconut oil", "Burns for 40+ hours"],
    category: "Candles",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Coco-de-Mer-Enraptured-Figment-Massage-Candle_1024x.png?v=1752078889",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/files/Coco-de-Mer-Enraptured-Figment-Massage-Candle_1024x.png?v=1752078889",
      "https://www.coco-de-mer.com/cdn/shop/files/Coco-de-Mer-Enraptured-Figment-Massage-Candle-lit_1024x.png?v=1752078889",
      "https://www.coco-de-mer.com/cdn/shop/files/Coco-de-Mer-Enraptured-Figment-Massage-Candle-pour_1024x.png?v=1752078889"
    ],
    productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-enraptured-figment-massage-candle-200g",
    sizing: { type: "weight", options: ["200g"], guide: "40+ hours burn time. Allow wax to pool fully before pouring onto skin." },
    materials: "Soy wax, shea butter, coconut oil, fragrance blend (jasmine, fig, sandalwood)",
    dimensions: "200g ceramic vessel — 9cm × 8cm",
    whatsIncluded: ["200g Massage Candle in ceramic vessel", "Care card", "Gift box"],
    careInstructions: "Trim wick to 5mm before each use. Allow a full melt pool to form. Test oil temperature on inner wrist before applying to skin."
  },
  {
    name: "Pure Delight Orgasm Balm",
    brand: "Coco de Mer",
    price: "£36.00",
    description: "Sensation-heightening intimate balm with natural botanicals",
    longDescription: "A delicate balm formulated with peppermint and ginger root extracts to naturally heighten sensation. Dermatologically tested and made with clean, body-safe ingredients.",
    features: ["20g compact size", "Peppermint & ginger root", "Dermatologically tested", "Clean ingredients"],
    category: "Wellness",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Pure-Delight-Orgasm-Balm_1024x.png?v=1752225275",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Pure-Delight-Orgasm-Balm_1024x.png?v=1752225275",
      "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Pure-Delight-Orgasm-Balm-open_1024x.png?v=1752225275"
    ],
    productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-pure-delight-orgasm-balm-20g",
    sizing: { type: "weight", options: ["20g"], guide: "A little goes a long way — apply a small amount to intimate areas" },
    materials: "Shea butter, coconut oil, peppermint oil, ginger root extract, vitamin E",
    dimensions: "20g pot — 5cm × 3cm",
    whatsIncluded: ["20g Pure Delight Orgasm Balm", "Instructions card"],
    careInstructions: "For external use only. Store below 25°C. Patch test recommended before first use."
  },
  {
    name: "Silk Blindfold",
    brand: "Coco de Mer",
    price: "£102.00",
    description: "Hand-finished mulberry silk blindfold for sensory exploration",
    longDescription: "Crafted from the finest mulberry silk with adjustable ribbon ties. The gentle weight and complete light exclusion heighten every other sense, transforming touch into something electric.",
    features: ["100% mulberry silk", "Adjustable ribbon ties", "Hand-finished in London", "Gift-boxed"],
    category: "Accessories",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco_de_Mer_Silk_Blindfold_1024x.png?v=1751638173",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/products/Coco_de_Mer_Silk_Blindfold_1024x.png?v=1751638173",
      "https://www.coco-de-mer.com/cdn/shop/products/Coco_de_Mer_Silk_Blindfold_detail_1024x.png?v=1751638173",
      "https://www.coco-de-mer.com/cdn/shop/products/Coco_de_Mer_Silk_Blindfold_box_1024x.png?v=1751638173"
    ],
    productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-blindfold",
    sizing: { type: "one-size", options: ["One size"], guide: "Adjustable ribbon ties fit all head sizes. Total length including ribbons: 85cm" },
    materials: "100% mulberry silk outer, silk charmeuse lining, silk satin ribbons",
    dimensions: "Eye mask: 20cm × 10cm, Ribbon ties: 65cm each",
    whatsIncluded: ["Silk Blindfold", "Coco de Mer gift box", "Silk dust bag"],
    careInstructions: "Hand wash in cool water with mild silk detergent. Do not tumble dry. Iron on low heat with a pressing cloth."
  },
  {
    name: "Celeste Quarter Cup Bra",
    brand: "Coco de Mer",
    price: "£234.00",
    description: "Hand-crafted French lace quarter-cup bra in midnight blue",
    longDescription: "Each Celeste piece is hand-cut from the finest French Leavers lace by skilled artisans. The quarter-cup silhouette celebrates the body with a daring yet refined aesthetic.",
    features: ["French Leavers lace", "Hand-cut & finished", "24k gold-plated hardware", "Sizes 32A-36DD"],
    category: "Lingerie",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Celestequartercupbrafront_d56f88d8-1b80-4ba6-ba50-bbc63c0c4a61_1024x.png?v=1767111157",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/files/Celestequartercupbrafront_d56f88d8-1b80-4ba6-ba50-bbc63c0c4a61_1024x.png?v=1767111157",
      "https://www.coco-de-mer.com/cdn/shop/files/Celestequartercupbraback_1024x.png?v=1767111157",
      "https://www.coco-de-mer.com/cdn/shop/files/Celestequartercupbradetail_1024x.png?v=1767111157"
    ],
    productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-celeste-quarter-cup-bra",
    sizing: {
      type: "bra",
      options: ["32A", "32B", "32C", "32D", "32DD", "34A", "34B", "34C", "34D", "34DD", "36A", "36B", "36C", "36D", "36DD"],
      guide: "Runs true to size. For between sizes, we recommend sizing up in the band. The quarter-cup style is designed to sit below the bust."
    },
    materials: "French Leavers lace, silk satin, 24k gold-plated hardware, adjustable straps",
    whatsIncluded: ["Celeste Quarter Cup Bra", "Branded lingerie bag", "Gift box"],
    careInstructions: "Hand wash only at 30°C. Do not bleach. Lay flat to dry. Do not iron directly on lace."
  },
  {
    name: "Reina Playsuit",
    brand: "Coco de Mer",
    price: "£462.00",
    description: "Exquisite silk and Chantilly lace bodysuit",
    longDescription: "The Reina Playsuit is the pinnacle of intimate luxury. Combining silk-satin with delicate Chantilly lace, each piece is hand-finished with meticulous attention to detail.",
    features: ["Silk-satin & Chantilly lace", "Hand-finished detailing", "Adjustable straps", "Sizes XS-XL"],
    category: "Lingerie",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/ReinaPlaysuitFront-ezgif.com-resize_1024x.png?v=1765557415",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/files/ReinaPlaysuitFront-ezgif.com-resize_1024x.png?v=1765557415",
      "https://www.coco-de-mer.com/cdn/shop/files/ReinaPlaysuitBack_1024x.png?v=1765557415",
      "https://www.coco-de-mer.com/cdn/shop/files/ReinaPlaysuitDetail_1024x.png?v=1765557415"
    ],
    productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-reina-playsuit",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6-8)", "S (UK 8-10)", "M (UK 10-12)", "L (UK 12-14)", "XL (UK 14-16)"],
      guide: "Designed for a close, flattering fit. If between sizes, size up for comfort. Adjustable straps allow customisation."
    },
    materials: "Silk satin, Chantilly lace, silk chiffon lining, covered buttons",
    whatsIncluded: ["Reina Playsuit", "Silk dust bag", "Coco de Mer gift box"],
    careInstructions: "Dry clean only. Store in provided dust bag. Handle lace panels with care."
  },
  {
    name: "Divine Glow Lubricant",
    brand: "Coco de Mer",
    price: "£42.00",
    description: "Premium water-based lubricant with hyaluronic acid",
    longDescription: "A clean-formula lubricant enriched with hyaluronic acid for lasting comfort. pH-balanced and compatible with all materials. Designed to feel as luxurious as the rest of your evening.",
    features: ["100ml pump bottle", "Hyaluronic acid enriched", "pH-balanced formula", "Condom compatible"],
    category: "Wellness",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Divine-Glow-Aqua-Lubricant_1024x.png?v=1751636529",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Divine-Glow-Aqua-Lubricant_1024x.png?v=1751636529",
      "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Divine-Glow-Aqua-Lubricant-pump_1024x.png?v=1751636529"
    ],
    productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-divine-glow-aqua-lubricant-100ml",
    sizing: { type: "volume", options: ["100ml"], guide: "Pump dispenser for easy, hygienic application" },
    materials: "Water, glycerin, hyaluronic acid, aloe vera extract. Free from parabens, glycols, and artificial fragrances.",
    dimensions: "100ml pump bottle — 16cm × 4cm",
    whatsIncluded: ["100ml Divine Glow Lubricant"],
    careInstructions: "Compatible with latex, polyisoprene, and silicone toys. Store at room temperature. Use within 6 months of opening."
  },
  {
    name: "Mercy Corset",
    brand: "Agent Provocateur",
    price: "£540.00",
    description: "Iconic structured corset with signature pink detailing",
    longDescription: "The Mercy Corset is Agent Provocateur at its most powerful. Boned for structure with signature pink satin trims and hook-and-eye closure. A piece that commands attention.",
    features: ["Steel boning structure", "Signature pink satin trim", "Hook-and-eye closure", "Sizes 32-38"],
    category: "Lingerie",
    imageUrl: "/products/ap-mercy-corset.png",
    images: [
      "/products/ap-mercy-corset.png"
    ],
    productUrl: "https://www.agentprovocateur.com/gb_en/lingerie/corsets-basques",
    sizing: {
      type: "corset",
      options: ["32 (UK 6-8)", "34 (UK 10)", "36 (UK 12)", "38 (UK 14)"],
      guide: "Corset sizes correspond to underbust measurements in inches. The boning provides 2-3 inches of waist reduction. For first-time corset wearers, size up."
    },
    materials: "Silk satin, cotton lining, steel spiral boning, silk satin ribbon trim, hook-and-eye closures",
    whatsIncluded: ["Mercy Corset", "Agent Provocateur garment bag", "Branded gift box"],
    careInstructions: "Dry clean only. Store flat or hanging. Do not fold — boning may warp. Avoid contact with sharp objects."
  },
  {
    name: "Lorna Plunge Underwired Bra",
    brand: "Agent Provocateur",
    price: "£108.00",
    description: "Silk and lace plunge bra with scalloped edges",
    longDescription: "The Lorna combines Italian silk-satin with intricate Calais lace for a modern plunge silhouette. Scalloped edges and a deep-V neckline make this piece both versatile and luxurious.",
    features: ["Italian silk-satin", "Calais lace overlay", "Scalloped edge detail", "Sizes 32B-36E"],
    category: "Lingerie",
    imageUrl: "/products/ap-lorna-bra.png",
    images: [
      "/products/ap-lorna-bra.png"
    ],
    productUrl: "https://www.agentprovocateur.com/gb_en/lingerie",
    sizing: {
      type: "bra",
      options: ["32B", "32C", "32D", "32DD", "32E", "34B", "34C", "34D", "34DD", "34E", "36B", "36C", "36D", "36DD", "36E"],
      guide: "True to size. The plunge neckline suits lower-cut tops. Underwired for medium to full bust support."
    },
    materials: "Italian silk satin, Calais lace, mesh lining, nickel-free underwire, adjustable straps",
    whatsIncluded: ["Lorna Plunge Underwired Bra", "Agent Provocateur garment bag"],
    careInstructions: "Hand wash at 30°C in a lingerie bag. Do not tumble dry. Reshape cups while damp and lay flat to dry."
  },
  {
    name: "Keia Silk Kimono",
    brand: "Agent Provocateur",
    price: "£348.00",
    description: "Floor-length silk kimono with hand-painted floral print",
    longDescription: "Wrap yourself in luxury with this floor-length silk kimono featuring an exclusive hand-painted floral print. The perfect piece for lounging at home or as an unforgettable gift.",
    features: ["100% mulberry silk", "Hand-painted print", "Floor-length cut", "One size fits most"],
    category: "Nightwear",
    imageUrl: null,
    images: [],
    productUrl: "https://www.agentprovocateur.com/gb_en/nightwear",
    sizing: {
      type: "one-size",
      options: ["One size fits most"],
      guide: "Generous cut suits UK 8-16. Length: 130cm from shoulder. Self-tie waist belt for adjustable fit."
    },
    materials: "100% mulberry silk, silk satin piping, self-fabric belt",
    dimensions: "Length: 130cm, Sleeve: 55cm, Chest: 120cm (laid flat)",
    whatsIncluded: ["Keia Silk Kimono", "Self-tie belt", "Agent Provocateur gift box"],
    careInstructions: "Dry clean recommended. If hand washing, use cold water with silk-safe detergent. Do not wring. Hang to dry away from direct sunlight."
  },
  {
    name: "Hosiery Gift Set",
    brand: "Agent Provocateur",
    price: "£78.00",
    description: "Signature hold-ups and suspender set in gift packaging",
    longDescription: "The perfect introduction to Agent Provocateur. Includes silk hold-up stockings and a matching suspender belt in the iconic pink and black gift box.",
    features: ["Silk-blend stockings", "Matching suspender belt", "Signature gift packaging", "One size"],
    category: "Accessories",
    imageUrl: "/products/ap-hosiery-set.png",
    images: [
      "/products/ap-hosiery-set.png"
    ],
    productUrl: "https://www.agentprovocateur.com/gb_en/accessories",
    sizing: {
      type: "hosiery",
      options: ["S/M (UK 8-12)", "M/L (UK 12-16)"],
      guide: "Stockings: 15 denier with silicone grip band. Suspender belt adjusts via hook-and-eye fastening."
    },
    materials: "85% nylon, 15% elastane stockings. Suspender belt: satin, elastic, metal clips",
    whatsIncluded: ["1 pair silk-blend hold-up stockings", "Matching suspender belt", "Iconic pink & black gift box"],
    careInstructions: "Hand wash stockings in lukewarm water. Lay flat to dry. Do not bleach or tumble dry."
  },
  {
    name: "G.Spot Vibrator",
    brand: "goop",
    price: "£90.00",
    description: "Double-ended personal massager in medical-grade silicone",
    longDescription: "Designed in collaboration with intimacy experts, this beautifully sculpted vibrator features dual motors and 10 intensity settings. Medical-grade silicone with a whisper-quiet motor.",
    features: ["Medical-grade silicone", "10 intensity settings", "USB rechargeable", "Waterproof IPX7"],
    category: "Wellness",
    imageUrl: null,
    images: [],
    productUrl: "https://goop.com/wellness/sexual-health/",
    sizing: { type: "dimensions", options: ["One size"], guide: "Length: 19.5cm, Insertable: 12cm, Diameter: 3.2cm (widest point)" },
    materials: "Body-safe medical-grade silicone, ABS plastic internal structure. Free from phthalates, BPA, and latex.",
    dimensions: "Length: 19.5cm, Width: 3.2cm, Weight: 105g",
    whatsIncluded: ["G.Spot Vibrator", "USB magnetic charging cable", "Satin storage pouch", "Instruction booklet"],
    careInstructions: "Clean before and after use with warm water and mild soap or toy cleaner. Fully charge before first use (2 hours). Run time: 60 minutes."
  },
  {
    name: "Scented Candle: Edition 04 Orchard",
    brand: "goop",
    price: "£58.00",
    description: "Hand-poured coconut wax candle with fig, orchard fruit and cedarwood",
    longDescription: "A clean-burning coconut and beeswax blend scented with sun-drenched orchard notes — ripe fig, warm cedarwood and a touch of hay. Burns for 60+ hours. Perfect for setting the mood.",
    features: ["60-hour burn time", "Coconut & beeswax blend", "Fig & cedarwood notes", "Non-toxic & clean"],
    category: "Date Night",
    imageUrl: "https://static.thcdn.com/productimg/original/13310790-2014896412930473.jpg",
    images: [
      "https://static.thcdn.com/productimg/original/13310790-2014896412930473.jpg",
      "https://static.thcdn.com/productimg/original/13310790-2014896412930474.jpg"
    ],
    productUrl: "https://goop.com/shop/home/candles/",
    sizing: { type: "weight", options: ["305g / 10.7oz"], guide: "Burns for 60+ hours. First burn: allow wax to pool to the edges (approximately 3 hours)." },
    materials: "Coconut and beeswax blend, cotton wick, clean fragrance oils (fig, cedarwood, hay, green leaves)",
    dimensions: "305g glass vessel — 10cm × 9cm",
    whatsIncluded: ["Edition 04 Orchard Candle", "Glass vessel with lid"],
    careInstructions: "Trim wick to 6mm before each burn. Burn for 3-4 hours maximum per session. Keep away from draughts."
  },
  {
    name: "Edition 04 Orchard Eau de Parfum",
    brand: "goop",
    price: "£108.00",
    description: "Warm, woody unisex fragrance with fig and sandalwood",
    longDescription: "Edition 04 opens with sun-warmed fig and green leaves before settling into orris root and sandalwood. A clean, skin-like scent that becomes uniquely yours. Perfect for sharing.",
    features: ["50ml eau de parfum", "Clean & non-toxic", "Fig, orris root, sandalwood", "Unisex fragrance"],
    category: "Fragrance",
    imageUrl: "https://static.thcdn.com/productimg/original/13317640-8414896456928977.jpg",
    images: [
      "https://static.thcdn.com/productimg/original/13317640-8414896456928977.jpg",
      "https://static.thcdn.com/productimg/original/13317640-8414896456928978.jpg"
    ],
    productUrl: "https://goop.com/shop/beauty/fragrance/",
    sizing: { type: "volume", options: ["50ml / 1.7 fl oz"], guide: "Eau de Parfum concentration (15-20%). Apply to pulse points — wrists, neck, behind ears. Lasts 6-8 hours." },
    materials: "Alcohol denat., parfum (fragrance), water. Top: fig leaf, green mandarin. Heart: orris, jasmine. Base: sandalwood, musk, cedarwood.",
    dimensions: "50ml glass bottle — 12cm × 5cm",
    whatsIncluded: ["50ml Eau de Parfum", "Branded box"],
    careInstructions: "Store in a cool, dry place away from direct sunlight. Keep cap on when not in use."
  },
  {
    name: "G.Tox Detox Bath Soak",
    brand: "goop",
    price: "£45.00",
    description: "Purifying bath soak with Himalayan salt and activated charcoal",
    longDescription: "A deep-cleansing mineral soak that draws out impurities while replenishing with magnesium-rich Himalayan pink salt. Add to a hot bath and soak for 20 minutes for the full detox effect.",
    features: ["680g tub", "Himalayan pink salt", "Activated charcoal", "Clean ingredients"],
    category: "Bath",
    imageUrl: "https://static.thcdn.com/productimg/original/13310780-6404896412642401.jpg",
    images: [
      "https://static.thcdn.com/productimg/original/13310780-6404896412642401.jpg",
      "https://static.thcdn.com/productimg/original/13310780-6404896412642402.jpg"
    ],
    productUrl: "https://goop.com/shop/beauty/bath-body/",
    sizing: { type: "weight", options: ["680g / 24oz"], guide: "Add 2-3 generous handfuls to warm running bath. Soak for at least 20 minutes. Approximately 8-10 baths per tub." },
    materials: "Himalayan pink salt, Dead Sea salt, activated coconut charcoal, Australian sandalwood oil, vetiver oil",
    dimensions: "680g jar — 12cm × 10cm",
    whatsIncluded: ["680g G.Tox Detox Bath Soak"],
    careInstructions: "Reseal jar tightly after use. Store in a dry place. For external use only."
  },
  {
    name: "The Martini Bath Soak",
    brand: "goop",
    price: "£42.00",
    description: "Emotional detox bath soak with CBD and botanicals",
    longDescription: "Named for the clean, sharp feeling it leaves behind. This mineral-rich soak combines Epsom salt with a calming blend of botanical oils. The ultimate couples wind-down ritual.",
    features: ["680g tub", "Epsom salt base", "Botanical oil blend", "Calming CBD formula"],
    category: "Bath",
    imageUrl: "https://static.thcdn.com/productimg/original/13310784-1444896412756539.jpg",
    images: [
      "https://static.thcdn.com/productimg/original/13310784-1444896412756539.jpg",
      "https://static.thcdn.com/productimg/original/13310784-1444896412756540.jpg"
    ],
    productUrl: "https://goop.com/shop/beauty/bath-body/",
    sizing: { type: "weight", options: ["680g / 24oz"], guide: "Add 2-3 handfuls to warm running bath. Soak for 20+ minutes for full effect. Approximately 8-10 baths per tub." },
    materials: "Epsom salt (magnesium sulfate), sodium bicarbonate, CBD extract, lavender oil, Roman chamomile oil, ylang ylang oil",
    dimensions: "680g jar — 12cm × 10cm",
    whatsIncluded: ["680g The Martini Bath Soak"],
    careInstructions: "Reseal jar tightly after use. Store in a cool, dry place. For external use only."
  },
  {
    name: "Lip & Cheek Duo",
    brand: "Space NK",
    price: "£42.00",
    description: "Buildable cream colour for a natural, flushed glow",
    longDescription: "A bestselling multi-use colour stick that gives lips and cheeks a sheer, dewy flush. Enriched with vitamin E and jojoba oil. The perfect low-effort luxury for date night prep.",
    features: ["Multi-use stick", "Vitamin E & jojoba", "Buildable sheer colour", "6 shades available"],
    category: "Beauty",
    imageUrl: "https://milkmakeup.com/cdn/shop/products/SHOT05_MINILIP_CHEEK_OPEN_DASH_533x.jpg?v=1737741718",
    images: [
      "https://milkmakeup.com/cdn/shop/products/SHOT05_MINILIP_CHEEK_OPEN_DASH_533x.jpg?v=1737741718",
      "https://milkmakeup.com/cdn/shop/products/SHOT05_MINILIP_CHEEK_SWATCH_533x.jpg?v=1737741718"
    ],
    productUrl: "https://www.spacenk.com/uk/makeup/lips",
    sizing: {
      type: "shade",
      options: ["Werk (dusty rose)", "Perk (peach)", "Flip (berry)", "Dusk (mauve)", "Blaze (coral)", "Quickie (nude pink)"],
      guide: "Sheer, buildable formula. Apply to lips, cheeks, or eyelids. Works on all skin tones."
    },
    materials: "Mango butter, avocado oil, jojoba oil, vitamin E, natural pigments. Vegan & cruelty-free.",
    dimensions: "6g stick — 8cm × 2.5cm",
    whatsIncluded: ["Lip & Cheek colour stick"],
    careInstructions: "Retract after use. Store below 25°C to prevent melting. Use within 12 months of opening."
  },
  {
    name: "Baccarat Rouge 540 Eau de Parfum",
    brand: "Space NK",
    price: "£312.00",
    description: "The iconic Maison Francis Kurkdjian fragrance",
    longDescription: "One of the most sought-after fragrances in the world. Jasmine, saffron and ambergris create a luminous, woody-floral scent that lingers on skin for hours. An unforgettable gift.",
    features: ["70ml eau de parfum", "Jasmine, saffron, ambergris", "Maison Francis Kurkdjian", "Signature red bottle"],
    category: "Fragrance",
    imageUrl: null,
    images: [],
    productUrl: "https://www.spacenk.com/uk/fragrance",
    sizing: { type: "volume", options: ["70ml / 2.4 fl oz"], guide: "Eau de Parfum concentration. Longevity: 8-12 hours. Sillage: moderate to strong. Apply to pulse points." },
    materials: "Top notes: jasmine, saffron. Heart: ambergris, Egyptian jasmine. Base: fir resin, cedarwood. Contains alcohol denat.",
    dimensions: "70ml glass bottle with signature red cap — 14cm × 6cm",
    whatsIncluded: ["70ml Baccarat Rouge 540 Eau de Parfum", "Maison Francis Kurkdjian presentation box"],
    careInstructions: "Store away from heat and direct sunlight. Keep bottle upright. Do not expose to extreme temperatures."
  },
  {
    name: "SONA 2 Cruise",
    brand: "LELO",
    price: "£139.00",
    description: "Sonic clitoral massager with Cruise Control technology",
    longDescription: "LELO's most advanced sonic massager uses SenSonic technology to stimulate the entire clitoris, not just the surface. Cruise Control reserves 20% power so intensity never drops when pressed harder.",
    features: ["SenSonic technology", "Cruise Control power", "12 intensity settings", "Waterproof & rechargeable"],
    category: "Wellness",
    imageUrl: "https://static.thcdn.com/productimg/original/12669854-1544930111945017.jpg",
    images: [
      "https://static.thcdn.com/productimg/original/12669854-1544930111945017.jpg",
      "https://static.thcdn.com/productimg/original/12669854-1544930111945018.jpg"
    ],
    productUrl: "https://www.lelo.com/sona-2-cruise",
    sizing: { type: "dimensions", options: ["One size"], guide: "Length: 11.3cm, Width: 5.6cm. Ergonomic handheld design." },
    materials: "Body-safe silicone (FDA-approved), ABS plastic. Phthalate-free, latex-free, BPA-free.",
    dimensions: "Length: 11.3cm, Width: 5.6cm, Depth: 4.6cm, Weight: 116g",
    whatsIncluded: ["SONA 2 Cruise massager", "USB charging cable", "Satin storage pouch", "Warranty card", "Instruction manual"],
    careInstructions: "Clean with warm water and LELO Cleaning Spray or mild soap. Fully waterproof (IPX7). Charge for 2 hours. Run time: 60 minutes. 1-year warranty."
  },
  {
    name: "TIANI 3",
    brand: "LELO",
    price: "£169.00",
    description: "Remote-controlled couples' massager worn during intimacy",
    longDescription: "Designed to be worn during lovemaking, TIANI 3 uses SenseMotion technology controlled by an elegant remote. Delivers vibrations to both partners simultaneously for shared pleasure.",
    features: ["SenseMotion remote", "Worn during intimacy", "8 vibration modes", "Body-safe silicone"],
    category: "Intimacy",
    imageUrl: "https://static.thcdn.com/productimg/1600/1600/12669865-2634791714156570.jpg",
    images: [
      "https://static.thcdn.com/productimg/1600/1600/12669865-2634791714156570.jpg",
      "https://static.thcdn.com/productimg/1600/1600/12669865-2634791714156571.jpg"
    ],
    productUrl: "https://www.lelo.com/tiani-3",
    sizing: { type: "dimensions", options: ["One size"], guide: "External arm: 7.9cm, Insertable arm: 7.6cm. Flexible design adapts to different body types." },
    materials: "Body-safe silicone, ABS plastic remote. Phthalate-free, latex-free, BPA-free.",
    dimensions: "Length: 7.9cm, Insertable: 7.6cm, Width: 3.1cm, Weight: 75g (main unit), Remote: 45g",
    whatsIncluded: ["TIANI 3 couples' massager", "Wireless SenseMotion remote", "USB charging cable", "Satin storage pouch", "Instruction manual", "Warranty card"],
    careInstructions: "Clean before and after each use. Use water-based lubricant only. Fully waterproof. Charge for 2 hours. Run time: 120 minutes. 1-year warranty."
  },
  {
    name: "Desire Luxury G-Spot Vibrator",
    brand: "Lovehoney",
    price: "£49.99",
    description: "Rechargeable curved vibrator with 20 patterns and storage case",
    longDescription: "The bestselling Desire range combines premium silicone with powerful motors. This curved G-spot vibrator has 20 vibration patterns, whisper-quiet operation, and comes in a sleek storage case.",
    features: ["20 vibration patterns", "Premium silicone", "USB rechargeable", "Travel storage case"],
    category: "Wellness",
    imageUrl: "https://m.media-amazon.com/images/I/41tvtOkCVbL._SL500_.jpg",
    images: [
      "https://m.media-amazon.com/images/I/41tvtOkCVbL._SL500_.jpg"
    ],
    productUrl: "https://www.lovehoney.co.uk/vibrators/g-spot-vibrators/",
    sizing: { type: "dimensions", options: ["One size"], guide: "Length: 20cm, Insertable: 13cm, Diameter: 3.4cm (widest point)" },
    materials: "Premium body-safe silicone, ABS plastic. Phthalate-free, non-porous.",
    dimensions: "Length: 20cm, Insertable: 13cm, Width: 3.4cm, Weight: 120g",
    whatsIncluded: ["Desire Luxury G-Spot Vibrator", "USB magnetic charging cable", "Zip-lock storage case", "Instruction booklet"],
    careInstructions: "Clean with warm water and antibacterial toy cleaner. Use water-based lubricant only. Submersible waterproof. Charge: 90 min. Run time: 60 min."
  },
  {
    name: "Augustinus Bader The Cream",
    brand: "Space NK",
    price: "£198.00",
    description: "Award-winning face cream with TFC8 cell-renewing technology",
    longDescription: "Backed by 30 years of stem cell research, The Cream uses patented TFC8 technology to support skin's natural renewal. Lightweight yet deeply hydrating — a luxury skincare essential.",
    features: ["50ml jar", "Patented TFC8 technology", "Fragrance-free", "Clinically proven results"],
    category: "Skincare",
    imageUrl: "https://www.spacenk.com/on/demandware.static/-/Sites-spacenkmastercatalog/default/dwcbf19d94/products/AUGUSTINUS/UK200026405_AUGUSTINUS.jpg",
    images: [
      "https://www.spacenk.com/on/demandware.static/-/Sites-spacenkmastercatalog/default/dwcbf19d94/products/AUGUSTINUS/UK200026405_AUGUSTINUS.jpg"
    ],
    productUrl: "https://www.spacenk.com/uk/skincare",
    sizing: { type: "volume", options: ["50ml / 1.7 fl oz"], guide: "Apply a pea-sized amount morning and evening to clean skin. One jar lasts approximately 2-3 months with daily use." },
    materials: "TFC8 complex (vitamins, amino acids, synthesised molecules), squalane, evening primrose oil, vitamin E. Fragrance-free.",
    dimensions: "50ml jar — 6cm × 5cm",
    whatsIncluded: ["50ml The Cream", "Branded jar with lid", "Product information card"],
    careInstructions: "Replace lid after each use. Store at room temperature. Use within 12 months of opening."
  },
  {
    name: "Daisy Lingerie Set",
    brand: "Sophie & Olivia",
    price: "£95.00",
    description: "Delicate floral-inspired lingerie set with hand-finished lace",
    longDescription: "The Daisy set features intricate floral lace applique on a sheer tulle base. Each piece is hand-finished with satin-bound edges. Includes balconette bra, thong, and suspender belt.",
    features: ["Hand-finished lace", "Balconette + thong + suspender", "Satin-bound edges", "Sizes XS-XL"],
    category: "Lingerie",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame187_1024x1024.png?v=1771671712",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame187_1024x1024.png?v=1771671712",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame188_1024x1024.png?v=1771671712",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame189_1024x1024.png?v=1771671712"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/daisy-lingerie-set",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "Runs true to size. Balconette style suits A-D cups. Adjustable suspender straps. If between sizes, size up for comfort."
    },
    materials: "French lace, tulle, satin binding, adjustable elastic straps",
    whatsIncluded: ["Balconette bra", "Thong", "Suspender belt", "Branded bag"],
    careInstructions: "Hand wash at 30°C. Do not tumble dry. Lay flat to dry."
  },
  {
    name: "Gia Bodysuit",
    brand: "Sophie & Olivia",
    price: "£107.00",
    description: "Sculpted mesh bodysuit with strategic boning and plunge front",
    longDescription: "Engineered to flatter with subtle boning at the waist and a dramatic plunge neckline. Italian power-mesh with velvet-soft lining for all-day (or all-night) comfort.",
    features: ["Italian power-mesh", "Strategic boning", "Plunge neckline", "Sizes XS-XL"],
    category: "Lingerie",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame129_1_1024x1024.png?v=1771861708",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame129_1_1024x1024.png?v=1771861708",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame130_1024x1024.png?v=1771861708",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame131_1024x1024.png?v=1771861708"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/gia-bodysuit",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "Fitted silhouette with light boning. Snap-button closure at gusset. If between sizes, size up."
    },
    materials: "Italian power-mesh, velvet-soft lining, flexible boning, snap-button closures",
    whatsIncluded: ["Gia Bodysuit", "Branded bag"],
    careInstructions: "Hand wash at 30°C. Do not bleach. Lay flat to dry. Do not iron."
  },
  {
    name: "Joyce 4-Piece Set",
    brand: "Sophie & Olivia",
    price: "£107.00",
    description: "Complete luxury lingerie set with bra, brief, thong and suspender",
    longDescription: "The ultimate lingerie wardrobe in one box. Four coordinating pieces in midnight navy lace with gold hardware. Designed to mix, match and layer for countless configurations.",
    features: ["4 pieces in one set", "Midnight navy lace", "Gold-plated hardware", "Gift-boxed"],
    category: "Lingerie",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame78_1024x1024.png?v=1771528463",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame78_1024x1024.png?v=1771528463",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame79_1024x1024.png?v=1771528463",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame80_1024x1024.png?v=1771528463"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/joyce-4-piece-set",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "Bra suits A-D cups. Brief and thong have elasticated waist. Suspender belt is adjustable. If between sizes, size up."
    },
    materials: "Midnight navy lace, mesh, gold-plated hardware, adjustable elastic",
    whatsIncluded: ["Bra", "Brief", "Thong", "Suspender belt", "Gift box"],
    careInstructions: "Hand wash at 30°C. Do not tumble dry. Lay flat to dry."
  },
  {
    name: "Jade 3-Piece Set",
    brand: "Sophie & Olivia",
    price: "£74.00",
    description: "Elegant three-piece lingerie set in delicate sheer fabric",
    longDescription: "The Jade set combines sheer tulle with intricate lace detailing for an effortlessly seductive look. Three coordinating pieces designed to be mixed and layered.",
    features: ["3-piece set", "Sheer tulle & lace", "Coordinating design", "Sizes XS-XL"],
    category: "Lingerie",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame93.png?v=1771670560&width=1024",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame93.png?v=1771670560&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame94.png?v=1771670560&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame95.png?v=1771670560&width=1024"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/jade-3-piece-lingerie-set",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "True to size. Sheer tulle has slight stretch. If between sizes, size up."
    },
    materials: "Sheer tulle, intricate lace, elastic trim",
    whatsIncluded: ["Bra", "Thong", "Suspender belt", "Branded bag"],
    careInstructions: "Hand wash at 30°C. Do not bleach or tumble dry. Lay flat to dry."
  },
  {
    name: "Magda Lingerie Set",
    brand: "Sophie & Olivia",
    price: "£74.00",
    description: "Romantic white lace lingerie set with a classic silhouette",
    longDescription: "The Magda set features classic white lace with a modern cut. A beautifully romantic choice for special occasions or everyday luxury. Delicate, feminine, and flattering.",
    features: ["White lace design", "Classic romantic silhouette", "Special occasion or everyday", "Sizes XS-XL"],
    category: "Lingerie",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_511.png?v=1771857683&width=1024",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_511.png?v=1771857683&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_512.png?v=1771857683&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_513.png?v=1771857683&width=1024"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/magda-lingerie",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "True to size. Classic cut with moderate coverage. If between sizes, size up."
    },
    materials: "White lace, satin trim, adjustable elastic straps",
    whatsIncluded: ["Bra", "Thong", "Branded bag"],
    careInstructions: "Hand wash in cold water. Do not bleach. Lay flat to dry. Iron on lowest setting if needed."
  },
  {
    name: "Noa Slip Dress",
    brand: "Sophie & Olivia",
    price: "£64.00",
    description: "Luxurious satin slip dress for lounging or layering",
    longDescription: "The Noa is a versatile satin slip dress that works as sleepwear, loungewear, or styled as a going-out piece. Bias-cut for a flattering drape with adjustable spaghetti straps.",
    features: ["Satin fabric", "Bias-cut drape", "Adjustable straps", "Sizes XS-XL"],
    category: "Nightwear",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame570.png?v=1772032819&width=1024",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame570.png?v=1772032819&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame571.png?v=1772032819&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame572.png?v=1772032819&width=1024"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/noa-loungewear",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "Relaxed fit, bias-cut drape. Length: Mini (approx 80cm from shoulder). Adjustable spaghetti straps."
    },
    materials: "Satin (polyester blend), adjustable spaghetti straps, lace trim at hem",
    dimensions: "Length: approximately 80cm from shoulder (size M)",
    whatsIncluded: ["Noa Slip Dress", "Branded bag"],
    careInstructions: "Machine wash at 30°C in a laundry bag. Do not tumble dry. Hang to dry. Iron on low heat."
  },
  {
    name: "Amber Lingerie Set",
    brand: "Sophie & Olivia",
    price: "£69.00",
    description: "Bold and sensual lingerie set with cut-out detailing",
    longDescription: "The Amber set features daring cut-out panels and delicate strap work for a contemporary, confident look. Designed to make you feel empowered and irresistible.",
    features: ["Cut-out detailing", "Strap-work design", "Contemporary styling", "Sizes XS-XL"],
    category: "Lingerie",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_700.png?v=1772031000&width=1024",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_700.png?v=1772031000&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_701.png?v=1772031000&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_702.png?v=1772031000&width=1024"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/amber-lingerie-set",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "Fitted style. Strap work is adjustable. If between sizes, size up for comfort."
    },
    materials: "Mesh, elastic straps, metal hardware, satin trim",
    whatsIncluded: ["Bra/harness top", "Thong", "Branded bag"],
    careInstructions: "Hand wash at 30°C. Do not tumble dry. Lay flat to dry."
  },
  {
    name: "Celeste Bodysuit",
    brand: "Sophie & Olivia",
    price: "£60.00",
    description: "Sleek bodysuit with sheer panels and lace trim",
    longDescription: "The Celeste bodysuit combines opaque and sheer panels for a play of reveal and conceal. Flattering lace trim at the neckline and high-cut legs elongate the silhouette.",
    features: ["Sheer panel design", "Lace neckline trim", "High-cut silhouette", "Sizes XS-XL"],
    category: "Lingerie",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_827.png?v=1772032365&width=1024",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_827.png?v=1772032365&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_828.png?v=1772032365&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_829.png?v=1772032365&width=1024"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/celeste-bodysuit",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "Fitted silhouette with slight stretch. Snap-button closure. If between sizes, size up."
    },
    materials: "Mesh, lace trim, opaque panels, snap-button closures",
    whatsIncluded: ["Celeste Bodysuit", "Branded bag"],
    careInstructions: "Hand wash at 30°C. Do not bleach. Lay flat to dry."
  },
  {
    name: "Charlotte Lingerie Set",
    brand: "Sophie & Olivia",
    price: "£89.00",
    description: "Three-piece set with gu\u00EApi\u00E8re, string and thigh bands",
    longDescription: "The Charlotte is a statement set featuring a structured gu\u00EApi\u00E8re with matching string and thigh bands. Designed for those who love classic French lingerie with a modern edge.",
    features: ["Gu\u00EApi\u00E8re + string + thigh bands", "Structured silhouette", "French-inspired design", "Sizes XS-XL"],
    category: "Lingerie",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/ensemble-trois-pieces-guepiere-string-tours-de-cuisses-confess-noir-175205_9872ca1f-0740-447f-88b1-24b9ab306c37.png?v=1756387842&width=1024",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/ensemble-trois-pieces-guepiere-string-tours-de-cuisses-confess-noir-175205_9872ca1f-0740-447f-88b1-24b9ab306c37.png?v=1756387842&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/ensemble-trois-pieces-guepiere-string-tours-de-cuisses-confess-noir-175205_back.png?v=1756387842&width=1024"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/charlotte-lingerie-set",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "Structured fit with light boning in gu\u00EApi\u00E8re. Thigh bands are adjustable. If between sizes, size up."
    },
    materials: "Lace, mesh, satin straps, light boning, adjustable elastic thigh bands",
    whatsIncluded: ["Gu\u00EApi\u00E8re", "String", "2 thigh bands", "Branded bag"],
    careInstructions: "Hand wash at 30°C. Do not tumble dry. Lay flat to dry. Do not iron."
  },
  {
    name: "Aria Lingerie Set",
    brand: "Sophie & Olivia",
    price: "£74.00",
    description: "Elegant lingerie set with intricate embroidery and mesh",
    longDescription: "The Aria set combines delicate embroidered lace with soft mesh for a look that is both refined and alluring. Perfect for gifting or treating yourself.",
    features: ["Embroidered lace detail", "Soft mesh panels", "Elegant design", "Sizes XS-XL"],
    category: "Lingerie",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame36.png?v=1771532318&width=1024",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame36.png?v=1771532318&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame37.png?v=1771532318&width=1024",
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame38.png?v=1771532318&width=1024"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/aria-lingerie-set",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "True to size. Embroidered lace has minimal stretch. If between sizes, size up."
    },
    materials: "Embroidered lace, soft mesh, satin trim, adjustable elastic straps",
    whatsIncluded: ["Bra", "Thong", "Branded bag"],
    careInstructions: "Hand wash at 30°C. Do not bleach. Lay flat to dry."
  },
];
