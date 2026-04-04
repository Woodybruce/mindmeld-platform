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
    category: "Wellness",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Roseravished-Massage-Oil_1024x.png?v=1752055199",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Roseravished-Massage-Oil_1024x.png?v=1752055199"
    ],
    productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-roseravished-massage-oil-100ml",
    sizing: { type: "volume", options: ["100ml"], guide: "One bottle provides approximately 8-10 full body massage sessions" },
    materials: "Sweet almond oil, jojoba oil, Damascus rose essential oil, neroli oil, ylang ylang oil, vitamin E",
    dimensions: "100ml glass bottle — 15cm × 5cm",
    whatsIncluded: ["100ml Roseravished Massage Oil", "Gift box"],
    careInstructions: "Store in a cool, dry place away from direct sunlight. Use within 12 months of opening."
  },
  {
    name: "Pure Delight Orgasm Balm",
    brand: "Coco de Mer",
    price: "£36.00",
    description: "Sensation-heightening intimate balm with natural botanicals",
    longDescription: "A luxurious water-based balm infused with natural botanicals to heighten sensitivity and enhance pleasure. Delicate enough for intimate use with a subtle warming sensation.",
    features: ["10ml precision applicator", "Natural botanical formula", "Subtle warming sensation", "Water-based & pH balanced"],
    category: "Wellness",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Pure-Delight-Orgasm-Balm_1024x.png?v=1752225275",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Pure-Delight-Orgasm-Balm_1024x.png?v=1752225275"
    ],
    productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-pure-delight-orgasm-balm",
    sizing: { type: "volume", options: ["10ml"] },
    materials: "Water, glycerin, botanical extracts, natural warming agents",
    dimensions: "10ml tube — 12cm × 3cm",
    whatsIncluded: ["10ml Pure Delight Orgasm Balm", "Gift box"],
    careInstructions: "Store at room temperature. Use within 6 months of opening."
  },
  {
    name: "G.Tox Detox Bath Soak",
    brand: "goop",
    price: "£45.00",
    description: "Purifying bath soak with Himalayan salt and activated charcoal",
    longDescription: "A deeply purifying bath soak that draws out impurities while nourishing skin. Himalayan pink salt provides 84 trace minerals while activated charcoal detoxifies — the ultimate couples wind-down ritual.",
    features: ["680g jar", "Himalayan pink salt", "Activated charcoal", "Essential oil blend"],
    category: "Wellness",
    imageUrl: "https://static.thcdn.com/productimg/original/13310780-6404896412642401.jpg",
    images: [
      "https://static.thcdn.com/productimg/original/13310780-6404896412642401.jpg"
    ],
    productUrl: "https://goop.com/goop-beauty-g-tox-detox-5-salt-bath-soak",
    sizing: { type: "volume", options: ["680g"], guide: "Use 2-3 generous scoops per bath. One jar provides approximately 8-10 baths." },
    materials: "Himalayan pink salt, Dead Sea salt, activated charcoal, lavender essential oil, eucalyptus oil",
    dimensions: "680g jar — 12cm × 10cm",
    whatsIncluded: ["680g G.Tox Detox Bath Soak"],
    careInstructions: "Keep lid sealed between uses. Store in a cool, dry place."
  },
  {
    name: "The Martini Bath Soak",
    brand: "goop",
    price: "£42.00",
    description: "Emotional detox bath soak with CBD and botanicals",
    longDescription: "Named after goop's signature emotional detox cocktail, this luxurious soak combines Epsom salt with CBD and botanical extracts for the ultimate relaxation experience. Share a bath and let the stress melt away.",
    features: ["680g jar", "CBD-infused formula", "Epsom salt base", "Calming botanicals"],
    category: "Wellness",
    imageUrl: "https://static.thcdn.com/productimg/original/13310784-1444896412756539.jpg",
    images: [
      "https://static.thcdn.com/productimg/original/13310784-1444896412756539.jpg"
    ],
    productUrl: "https://goop.com/goop-beauty-the-martini-emotional-detox-bath-soak",
    sizing: { type: "volume", options: ["680g"], guide: "Use 2-3 generous scoops per bath. One jar provides approximately 8-10 baths." },
    materials: "Epsom salt, CBD extract, chamomile, lavender, frankincense essential oil",
    dimensions: "680g jar — 12cm × 10cm",
    whatsIncluded: ["680g The Martini Bath Soak"],
    careInstructions: "Keep lid sealed between uses. Store in a cool, dry place."
  },
  {
    name: "Augustinus Bader The Cream",
    brand: "Space NK",
    price: "£198.00",
    description: "Award-winning face cream with TFC8 cell-renewing technology",
    longDescription: "Backed by 30 years of stem cell research, The Cream uses patented TFC8 technology to support skin's natural renewal. Lightweight yet deeply hydrating — a luxury skincare essential to share.",
    features: ["50ml jar", "Patented TFC8 technology", "Fragrance-free", "Clinically proven results"],
    category: "Wellness",
    imageUrl: "https://www.beautyhabit.com/cdn/shop/files/45555-5-min.jpg?v=1749140382&width=1200",
    images: ["https://www.beautyhabit.com/cdn/shop/files/45555-5-min.jpg?v=1749140382&width=1200"],
    productUrl: "https://www.spacenk.com/uk/skincare",
    sizing: { type: "volume", options: ["50ml / 1.7 fl oz"], guide: "Apply a pea-sized amount morning and evening. One jar lasts approximately 2-3 months." },
    materials: "TFC8 complex (vitamins, amino acids, synthesised molecules), squalane, evening primrose oil, vitamin E",
    dimensions: "50ml jar — 6cm × 5cm",
    whatsIncluded: ["50ml The Cream", "Branded jar with lid"],
    careInstructions: "Replace lid after each use. Store at room temperature. Use within 12 months of opening."
  },
  {
    name: "SONA 2 Cruise",
    brand: "LELO",
    price: "£139.00",
    description: "Sonic clitoral massager with Cruise Control technology",
    longDescription: "Using sonic wave technology, SONA 2 Cruise delivers deep, reverberating pulses. Cruise Control maintains intensity even under pressure — designed for effortless, consistent pleasure.",
    features: ["Sonic wave technology", "Cruise Control", "12 stimulation settings", "Waterproof (IPX7)"],
    category: "Wellness",
    imageUrl: "https://static.thcdn.com/productimg/original/12669854-1544930111945017.jpg",
    images: [
      "https://static.thcdn.com/productimg/original/12669854-1544930111945017.jpg"
    ],
    productUrl: "https://www.lelo.com/sona-2-cruise",
    materials: "Body-safe silicone, ABS plastic, rechargeable lithium-ion battery",
    dimensions: "11.5cm × 5.5cm × 3.5cm",
    whatsIncluded: ["SONA 2 Cruise", "USB charging cable", "Satin storage pouch", "Warranty card"],
    careInstructions: "Clean with warm water and mild soap after each use. Fully waterproof."
  },

  {
    name: "Silk Blindfold",
    brand: "Coco de Mer",
    price: "£102.00",
    description: "Hand-finished mulberry silk blindfold for sensory exploration",
    longDescription: "Crafted from the finest mulberry silk with a gentle elastic band, this blindfold heightens the senses and builds anticipation. Beautifully packaged in a Coco de Mer gift box.",
    features: ["100% mulberry silk", "Hand-finished", "Adjustable elastic", "Gift-boxed"],
    category: "Intimacy",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco_de_Mer_Silk_Blindfold_1024x.png?v=1751638173",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/products/Coco_de_Mer_Silk_Blindfold_1024x.png?v=1751638173"
    ],
    productUrl: "https://www.coco-de-mer.com/products/silk-blindfold",
    materials: "100% mulberry silk, soft elastic headband",
    dimensions: "One size — 20cm × 9cm",
    whatsIncluded: ["Silk Blindfold", "Gift box"],
    careInstructions: "Hand wash in cool water with silk detergent. Lay flat to dry."
  },
  {
    name: "TIANI 3",
    brand: "LELO",
    price: "£169.00",
    description: "Remote-controlled couples' massager worn during intimacy",
    longDescription: "Designed to be worn by her during lovemaking, TIANI 3 uses SenseMotion technology — tilt the wireless remote to change vibration intensity. A shared experience that brings couples closer.",
    features: ["SenseMotion remote control", "Worn during intimacy", "8 vibration modes", "Rechargeable"],
    category: "Intimacy",
    imageUrl: "https://static.thcdn.com/productimg/1600/1600/12669865-2634791714156570.jpg",
    images: [
      "https://static.thcdn.com/productimg/1600/1600/12669865-2634791714156570.jpg"
    ],
    productUrl: "https://www.lelo.com/tiani-3",
    materials: "Body-safe silicone, ABS plastic, rechargeable lithium-ion battery",
    dimensions: "8cm × 5.5cm × 3cm (massager), 6cm × 3.5cm (remote)",
    whatsIncluded: ["TIANI 3 massager", "Wireless remote", "USB charging cable", "Satin pouch", "Warranty card"],
    careInstructions: "Clean with warm water and mild soap. Fully waterproof. Use only with water-based lubricant."
  },
  {
    name: "Gia Bodysuit",
    brand: "Sophie & Olivia",
    price: "£107.00",
    description: "Sculpted mesh bodysuit with strategic boning and plunge front",
    longDescription: "Engineered to flatter with subtle boning at the waist and a dramatic plunge neckline. Italian power-mesh with velvet-soft lining for all-day (or all-night) comfort.",
    features: ["Italian power-mesh", "Strategic boning", "Plunge neckline", "Sizes XS-XL"],
    category: "Intimacy",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame129_1_1024x1024.png?v=1771861708",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame129_1_1024x1024.png?v=1771861708"
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
    name: "Noa Slip Dress",
    brand: "Sophie & Olivia",
    price: "£64.00",
    description: "Luxurious satin slip dress for lounging or layering",
    longDescription: "The Noa is a versatile satin slip dress that works as sleepwear, loungewear, or styled as a going-out piece. Bias-cut for a flattering drape with adjustable spaghetti straps.",
    features: ["Satin fabric", "Bias-cut drape", "Adjustable straps", "Sizes XS-XL"],
    category: "Intimacy",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame570.png?v=1772032819&width=1024",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/Frame570.png?v=1772032819&width=1024"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/noa-loungewear",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "Relaxed fit, bias-cut drape. Length: Mini (approx 80cm from shoulder). Adjustable spaghetti straps."
    },
    materials: "Satin (polyester blend), adjustable spaghetti straps, lace trim at hem",
    whatsIncluded: ["Noa Slip Dress", "Branded bag"],
    careInstructions: "Machine wash at 30°C in a laundry bag. Do not tumble dry. Hang to dry."
  },
  {
    name: "Charlotte Lingerie Set",
    brand: "Sophie & Olivia",
    price: "£89.00",
    description: "Three-piece set with guêpière, string and thigh bands",
    longDescription: "The Charlotte is a statement set featuring a structured guêpière with matching string and thigh bands. Designed for those who love classic French lingerie with a modern edge.",
    features: ["Guêpière + string + thigh bands", "Structured silhouette", "French-inspired design", "Sizes XS-XL"],
    category: "Intimacy",
    imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/ensemble-trois-pieces-guepiere-string-tours-de-cuisses-confess-noir-175205_9872ca1f-0740-447f-88b1-24b9ab306c37.png?v=1756387842&width=1024",
    images: [
      "https://sophieolivia-lingerie.com/cdn/shop/files/ensemble-trois-pieces-guepiere-string-tours-de-cuisses-confess-noir-175205_9872ca1f-0740-447f-88b1-24b9ab306c37.png?v=1756387842&width=1024"
    ],
    productUrl: "https://sophieolivia-lingerie.com/products/charlotte-lingerie-set",
    sizing: {
      type: "clothing",
      options: ["XS (UK 6)", "S (UK 8)", "M (UK 10)", "L (UK 12)", "XL (UK 14)"],
      guide: "Structured fit with light boning in guêpière. Thigh bands are adjustable. If between sizes, size up."
    },
    materials: "Lace, mesh, satin straps, light boning, adjustable elastic thigh bands",
    whatsIncluded: ["Guêpière", "String", "2 thigh bands", "Branded bag"],
    careInstructions: "Hand wash at 30°C. Do not tumble dry. Lay flat to dry. Do not iron."
  },
  {
    name: "Celeste Quarter Cup Bra",
    brand: "Coco de Mer",
    price: "£234.00",
    description: "Hand-crafted French lace quarter-cup bra in midnight blue",
    longDescription: "Exquisite French Leavers lace quarter-cup bra from Coco de Mer's Celeste collection. Hand-finished with silk-bound edges and 24k gold-plated hardware.",
    features: ["French Leavers lace", "Quarter-cup silhouette", "24k gold-plated hardware", "Hand-finished"],
    category: "Intimacy",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Celestequartercupbrafront_d56f88d8-1b80-4ba6-ba50-bbc63c0c4a61_1024x.png?v=1767111157",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/files/Celestequartercupbrafront_d56f88d8-1b80-4ba6-ba50-bbc63c0c4a61_1024x.png?v=1767111157"
    ],
    productUrl: "https://www.coco-de-mer.com/products/celeste-quarter-cup-bra",
    sizing: {
      type: "bra",
      options: ["32B", "32C", "32D", "34B", "34C", "34D", "36B", "36C", "36D"],
      guide: "True to size. Underwired with adjustable straps. Quarter-cup provides minimal coverage."
    },
    materials: "French Leavers lace, silk binding, 24k gold-plated hardware, adjustable straps",
    whatsIncluded: ["Celeste Quarter Cup Bra", "Branded box"],
    careInstructions: "Hand wash only in cool water with lingerie wash. Do not tumble dry. Lay flat to dry."
  },

  {
    name: "Edition 04 Orchard Eau de Parfum",
    brand: "goop",
    price: "£108.00",
    description: "Warm, woody unisex fragrance with fig and sandalwood",
    longDescription: "A sophisticated unisex fragrance that opens with ripe fig and pear, mellowing into warm sandalwood and cedarwood. Share this scent as a couple — it layers beautifully on different skin.",
    features: ["50ml eau de parfum", "Unisex formulation", "Fig & sandalwood notes", "Hand-poured in LA"],
    category: "Gifts",
    imageUrl: "https://static.thcdn.com/productimg/original/13317640-8414896456928977.jpg",
    images: [
      "https://static.thcdn.com/productimg/original/13317640-8414896456928977.jpg"
    ],
    productUrl: "https://goop.com/goop-beauty-edition-04-orchard-eau-de-parfum",
    sizing: { type: "volume", options: ["50ml / 1.7 fl oz"] },
    materials: "Alcohol denat., parfum (fragrance), aqua, limonene, linalool",
    dimensions: "50ml bottle — 12cm × 4cm",
    whatsIncluded: ["50ml Eau de Parfum", "Gift box"],
    careInstructions: "Store away from direct sunlight and heat. Use within 36 months of opening."
  },
  {
    name: "Baccarat Rouge 540 Eau de Parfum",
    brand: "Space NK",
    price: "£312.00",
    description: "The iconic Maison Francis Kurkdjian fragrance — a masterpiece for gifting",
    longDescription: "One of the world's most coveted fragrances. Baccarat Rouge 540 opens with saffron and jasmine, drying down to amberwood and cedar. A truly unforgettable gift for someone you love.",
    features: ["70ml eau de parfum", "Saffron & jasmine opening", "Amberwood dry-down", "Maison Francis Kurkdjian"],
    category: "Gifts",
    imageUrl: "https://www.smallflower.com/cdn/shop/products/ProductListings-BaccaratRouge540EaudeParfum_70ml.png",
    images: ["https://www.smallflower.com/cdn/shop/products/ProductListings-BaccaratRouge540EaudeParfum_70ml.png"],
    productUrl: "https://www.spacenk.com/uk/fragrance",
    sizing: { type: "volume", options: ["70ml / 2.4 fl oz"] },
    materials: "Alcohol, parfum (fragrance), aqua, saffron extract, jasmine absolute",
    dimensions: "70ml bottle — 13cm × 6cm",
    whatsIncluded: ["70ml Eau de Parfum", "Designer box"],
    careInstructions: "Store away from direct sunlight. Keep cap on when not in use."
  },
  {
    name: "Hosiery Gift Set",
    brand: "Agent Provocateur",
    price: "£78.00",
    description: "Signature hold-ups and suspender set in gift packaging",
    longDescription: "The ultimate Agent Provocateur gift — featuring their signature seamed stockings and a satin suspender belt, wrapped in the brand's iconic pink and black packaging.",
    features: ["Seamed stockings", "Satin suspender belt", "Gift packaging", "One size fits most"],
    category: "Gifts",
    imageUrl: "https://m.media-amazon.com/images/I/71cCmV5J50L.jpg",
    images: ["https://m.media-amazon.com/images/I/71cCmV5J50L.jpg"],
    productUrl: "https://www.agentprovocateur.com/gb_en/hosiery",
    sizing: {
      type: "hosiery",
      options: ["One Size", "Small/Medium", "Medium/Large"],
      guide: "Hold-ups: One size (fits UK 8-14). Suspender belt: S/M (UK 6-10), M/L (UK 12-16)."
    },
    materials: "Stockings: 100% nylon with lycra top band. Suspender belt: satin with metal clips.",
    whatsIncluded: ["2 pairs seamed stockings", "Satin suspender belt", "Gift box"],
    careInstructions: "Hand wash stockings in cool water. Suspender belt: spot clean only."
  },
  {
    name: "Lip & Cheek Duo",
    brand: "Space NK",
    price: "£42.00",
    description: "Buildable cream colour for a natural, flushed glow",
    longDescription: "A multi-use stick that gives a dewy, just-kissed flush to lips and cheeks. Buildable from sheer to bold — perfect for getting ready together before date night.",
    features: ["Dual-purpose lip & cheek", "Buildable coverage", "Dewy finish", "Compact size"],
    category: "Gifts",
    imageUrl: "https://picknpamper.com/wp-content/uploads/2025/06/s2843258-av-3-zoom.jpg",
    images: ["https://picknpamper.com/wp-content/uploads/2025/06/s2843258-av-3-zoom.jpg"],
    productUrl: "https://www.spacenk.com/uk/makeup/lips",
    sizing: {
      type: "shade",
      options: ["Perk (warm nude)", "Dash (coral pink)", "Flip (berry)", "Ditz (rose)"],
      guide: "Apply directly to lips or cheeks and blend with fingertips for a natural flush."
    },
    materials: "Emollient-rich formula with vitamin E, jojoba oil, and shea butter",
    dimensions: "6g stick — 8cm × 2.5cm",
    whatsIncluded: ["Lip & Cheek Duo stick", "Cap"],
    careInstructions: "Replace cap after use. Store below 25°C to prevent melting."
  },
  {
    name: "Jo Malone Wood Sage & Sea Salt Cologne",
    brand: "Jo Malone",
    price: "£118.00",
    description: "Fresh, mineral fragrance inspired by wind-swept coastlines",
    longDescription: "Escape together with this evocative scent that captures the rugged British coastline — earthy sage paired with sea salt spray. Light enough to share as a couple's signature scent.",
    features: ["100ml cologne", "Unisex scent", "Sea salt & sage notes", "Hand-crafted in England"],
    category: "Gifts",
    imageUrl: "https://images-na.ssl-images-amazon.com/images/I/61nj0JW-gyL.jpg",
    images: ["https://images-na.ssl-images-amazon.com/images/I/61nj0JW-gyL.jpg"],
    productUrl: "https://www.jomalone.co.uk/product/25977/10073/colognes/wood-sage-sea-salt-cologne",
    sizing: { type: "volume", options: ["30ml", "100ml"] },
    materials: "Alcohol denat., parfum (fragrance), aqua, ambrette seed, sea salt accord, sage",
    dimensions: "100ml bottle — 14cm × 5cm",
    whatsIncluded: ["100ml Cologne", "Cream and black gift box"],
    careInstructions: "Store upright away from direct sunlight. Use within 36 months."
  },
  {
    name: "Personalised Star Map Print",
    brand: "Under Lucky Stars",
    price: "£65.00",
    description: "Custom map of the night sky from your special date and location",
    longDescription: "Capture the exact arrangement of stars from the night you met, your anniversary, or any meaningful moment. Each map is astronomically accurate and printed on premium paper — a truly one-of-a-kind keepsake.",
    features: ["Astronomically accurate", "Custom date & location", "Premium 250gsm paper", "Multiple frame sizes"],
    category: "Gifts",
    imageUrl: "https://d81e40b6.delivery.rocketcdn.me/wp-content/uploads/2020/03/underluckystars07-800x1067.jpg",
    images: ["https://d81e40b6.delivery.rocketcdn.me/wp-content/uploads/2020/03/underluckystars07-800x1067.jpg"],
    productUrl: "https://www.underluckystars.com",
    sizing: {
      type: "size",
      options: ["A4 (21 × 30cm)", "A3 (30 × 42cm)", "50 × 70cm"],
      guide: "Select your special date, location, and message. Each print is generated to order."
    },
    materials: "250gsm premium matte paper, archival inks",
    dimensions: "A3: 30 × 42cm (most popular)",
    whatsIncluded: ["Custom star map print", "Gift card with your message", "Protective tube"],
    careInstructions: "Frame behind glass to protect from UV. Avoid direct sunlight."
  },

  {
    name: "Enraptured Figment Massage Candle",
    brand: "Coco de Mer",
    price: "£60.00",
    description: "Hand-poured candle that melts into warm, fragrant massage oil",
    longDescription: "This exquisite candle fills the room with an intoxicating scent before melting into a pool of warm, skin-nourishing massage oil. Crafted with shea butter and coconut oil for a truly indulgent evening together.",
    features: ["200g soy wax blend", "Melts into massage oil", "Shea butter & coconut oil", "Burns for 40+ hours"],
    category: "Date Night",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Coco-de-Mer-Enraptured-Figment-Massage-Candle_1024x.png?v=1752078889",
    images: [
      "https://www.coco-de-mer.com/cdn/shop/files/Coco-de-Mer-Enraptured-Figment-Massage-Candle_1024x.png?v=1752078889"
    ],
    productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-enraptured-figment-massage-candle-200g",
    sizing: { type: "volume", options: ["200g"] },
    materials: "Soy wax, shea butter, coconut oil, essential oils",
    dimensions: "200g — 9cm × 8cm",
    whatsIncluded: ["200g Massage Candle", "Gift box"],
    careInstructions: "Trim wick to 5mm before each use. Burn for at least 2 hours to ensure even melt pool."
  },
  {
    name: "Scented Candle: Edition 04 Orchard",
    brand: "goop",
    price: "£58.00",
    description: "Hand-poured coconut wax candle with fig, orchard fruit and cedarwood",
    longDescription: "Set the mood with goop's signature Orchard scent — lush fig and orchard fruit layered with warm cedarwood. Hand-poured in LA using clean coconut wax for a slow, even burn.",
    features: ["260g coconut wax", "Clean-burning formula", "60+ hour burn time", "Hand-poured in LA"],
    category: "Date Night",
    imageUrl: "https://static.thcdn.com/productimg/original/13310790-2014896412930473.jpg",
    images: [
      "https://static.thcdn.com/productimg/original/13310790-2014896412930473.jpg"
    ],
    productUrl: "https://goop.com/goop-beauty-scented-candle-edition-04-orchard",
    sizing: { type: "volume", options: ["260g"] },
    materials: "Coconut wax, cotton wick, fragrance oils (fig, cedarwood, orchard fruit)",
    dimensions: "260g glass jar — 10cm × 9cm",
    whatsIncluded: ["260g Scented Candle", "Glass jar with lid"],
    careInstructions: "Trim wick to 5mm before each lighting. Do not burn for more than 4 hours at a time."
  },
  {
    name: "Couples Conversation Card Game",
    brand: "The School of Life",
    price: "£18.00",
    description: "100 meaningful questions to deepen your connection",
    longDescription: "Go beyond small talk with 100 thoughtfully crafted conversation prompts designed to help couples explore dreams, fears, memories and desires. From playful to profound — perfect for date night at home.",
    features: ["100 conversation cards", "5 themed categories", "Beautifully designed", "No app needed"],
    category: "Date Night",
    imageUrl: "https://m.media-amazon.com/images/I/61IN2spijzL.jpg",
    images: ["https://m.media-amazon.com/images/I/61IN2spijzL.jpg"],
    productUrl: "https://www.theschooloflife.com/shop/100-questions-love-couples-card-game",
    dimensions: "Card box: 12cm × 8cm × 4cm",
    whatsIncluded: ["100 conversation cards", "Instruction booklet", "Branded card box"],
    careInstructions: "Keep dry. Store in box to prevent damage."
  },
  {
    name: "Cocktail Smoker Kit",
    brand: "Aged & Charred",
    price: "£55.00",
    description: "Smoke cocktails together with real wood chips — oak, cherry, apple and hickory",
    longDescription: "Elevate date night with theatrical smoked cocktails. This premium kit includes everything you need to cold-smoke Old Fashioneds, Negronis, and more. Four wood chip varieties create different flavour profiles.",
    features: ["Premium smoking top", "4 wood chip varieties", "Works with any glass", "Makes 100+ cocktails"],
    category: "Date Night",
    imageUrl: "https://m.media-amazon.com/images/I/61J0ZKdP0CL.jpg",
    images: ["https://m.media-amazon.com/images/I/61J0ZKdP0CL.jpg"],
    productUrl: "https://www.agedandcharred.com",
    whatsIncluded: ["Smoking top", "Oak chips", "Cherry chips", "Apple chips", "Hickory chips", "Torch (butane not included)", "Recipe cards"],
    materials: "Stainless steel smoking top, natural wood chips",
    dimensions: "Smoking top: 10cm diameter",
    careInstructions: "Wipe smoking top clean after each use. Store wood chips in a cool, dry place."
  },
  {
    name: "Fondue Set for Two",
    brand: "Le Creuset",
    price: "£85.00",
    description: "Cast iron mini fondue set in iconic Le Creuset colours — chocolate or cheese date night",
    longDescription: "The quintessential date night centrepiece. Le Creuset's mini cocotte fondue set is perfectly sized for two, ideal for melting chocolate with strawberries or gooey cheese with bread. Comes with two colour-coded forks.",
    features: ["Cast iron construction", "1.1L capacity", "Includes 2 fondue forks", "Multiple colour options"],
    category: "Date Night",
    imageUrl: "https://admin.azuramart.com/media/images/products/1073/prod_05102021_615c059d18d7d.png",
    images: ["https://admin.azuramart.com/media/images/products/1073/prod_05102021_615c059d18d7d.png"],
    productUrl: "https://www.lecreuset.co.uk/fondue",
    sizing: {
      type: "colour",
      options: ["Cerise (red)", "Volcanic (orange)", "Satin Black", "Meringue (cream)"],
      guide: "Mini cocotte size — perfect for two. Holds 1.1L."
    },
    materials: "Enamelled cast iron, stainless steel forks, beechwood handles",
    dimensions: "1.1L — 16cm diameter × 12cm height",
    whatsIncluded: ["Cast iron fondue pot", "Lid", "Burner stand", "2 fondue forks"],
    careInstructions: "Hand wash with warm soapy water. Dry thoroughly. Do not use metal utensils on enamel interior."
  },
  {
    name: "Diptyque Baies Candle",
    brand: "Diptyque",
    price: "£56.00",
    description: "The iconic blackcurrant and rose candle — a date night essential",
    longDescription: "Diptyque's most beloved scent. Baies (Berries) blends Bulgarian roses with blackcurrant leaves for a fresh, romantic fragrance. The hand-poured wax burns cleanly for up to 60 hours.",
    features: ["190g hand-poured candle", "60-hour burn time", "Bulgarian rose & blackcurrant", "Iconic glass vessel"],
    category: "Date Night",
    imageUrl: "https://escentials.com/cdn/shop/products/escentials_B70V_1_110x110_crop_center.jpg?v=1649407425",
    images: ["https://escentials.com/cdn/shop/products/escentials_B70V_1_110x110_crop_center.jpg?v=1649407425"],
    productUrl: "https://www.diptyqueparis.com/en_gb/p/baies-berries-classic-candle.html",
    sizing: { type: "volume", options: ["190g", "300g", "600g"] },
    materials: "Paraffin-free wax blend, cotton wick, fragrance oils",
    dimensions: "190g — 7.5cm × 9cm",
    whatsIncluded: ["190g Baies Candle"],
    careInstructions: "Trim wick to 3mm before each use. First burn: let wax melt to edges (approx 2 hours)."
  },

  {
    name: "Our Place Night & Day Glasses",
    brand: "Our Place",
    price: "£45.00",
    description: "Set of 4 hand-blown borosilicate glasses — perfect for wine nights in",
    longDescription: "These beautifully crafted hand-blown glasses are made from durable borosilicate glass that's lighter and more refined than regular glass. Set of 4 in a colour that complements any table. Perfect for sharing a bottle at home.",
    features: ["Set of 4 glasses", "Hand-blown borosilicate", "Lightweight & durable", "Dishwasher safe"],
    category: "Home",
    imageUrl: "https://mocastore.org/cdn/shop/files/Night_Day_Glasses_Sunset_4_1024x1024.jpg?v=1743875341",
    images: ["https://mocastore.org/cdn/shop/files/Night_Day_Glasses_Sunset_4_1024x1024.jpg?v=1743875341"],
    productUrl: "https://fromourplace.co.uk/products/night-day-glasses",
    materials: "Hand-blown borosilicate glass",
    dimensions: "Each glass: 9cm × 8cm, 350ml capacity",
    whatsIncluded: ["4 × Night & Day glasses", "Branded box"],
    careInstructions: "Dishwasher safe. Avoid thermal shock (don't pour boiling liquid into cold glass)."
  },
  {
    name: "Cashmere Bed Socks",
    brand: "The White Company",
    price: "£45.00",
    description: "Sumptuously soft pure cashmere socks — the ultimate cosy-night-in luxury",
    longDescription: "Slip into pure luxury with these 100% cashmere bed socks from The White Company. Ribbed for a snug fit and impossibly soft — buy two pairs and match for cosy evenings on the sofa.",
    features: ["100% cashmere", "Ribbed knit", "One size fits most", "Gift-boxed"],
    category: "Home",
    imageUrl: "https://i.guim.co.uk/img/media/64d38e434f44ab760cfb572bc759a97f7d150a6f/386_214_4227_2536/master/4227.jpg?width=445&dpr=1&s=none&crop=none",
    images: ["https://i.guim.co.uk/img/media/64d38e434f44ab760cfb572bc759a97f7d150a6f/386_214_4227_2536/master/4227.jpg?width=445&dpr=1&s=none&crop=none"],
    productUrl: "https://www.thewhitecompany.com/uk/cashmere-bed-socks",
    sizing: {
      type: "size",
      options: ["One Size (UK 3-8)"],
      guide: "Generous stretch from ribbed knit. Fits UK shoe sizes 3-8."
    },
    materials: "100% cashmere, ribbed knit construction",
    whatsIncluded: ["1 pair Cashmere Bed Socks", "Gift box"],
    careInstructions: "Hand wash in cool water with cashmere shampoo. Reshape and lay flat to dry."
  },
  {
    name: "Luxury Faux Fur Throw",
    brand: "The White Company",
    price: "£149.00",
    description: "Ultra-soft faux fur throw — transform your sofa into a couples' sanctuary",
    longDescription: "Wrap up together in this incredibly soft faux fur throw. The deep pile has a sumptuous, tactile quality that makes every evening on the sofa feel special. Large enough for two.",
    features: ["140 × 200cm", "Deep-pile faux fur", "Satin-backed", "Machine washable"],
    category: "Home",
    imageUrl: "https://cdn.mos.cms.futurecdn.net/PmBPT7m66MSSuLZaBG2jV8.jpg",
    images: ["https://cdn.mos.cms.futurecdn.net/PmBPT7m66MSSuLZaBG2jV8.jpg"],
    productUrl: "https://www.thewhitecompany.com/uk/faux-fur-throw",
    sizing: {
      type: "size",
      options: ["140 × 200cm"],
      guide: "Large throw — generous enough for two on the sofa or draped across a king bed."
    },
    materials: "Front: 100% polyester faux fur. Back: satin polyester. Filling: polyester.",
    dimensions: "140 × 200cm",
    whatsIncluded: ["Faux Fur Throw"],
    careInstructions: "Machine wash at 30°C on a gentle cycle. Tumble dry on low. Do not iron."
  },
  {
    name: "Always Pan 2.0",
    brand: "Our Place",
    price: "£125.00",
    description: "The iconic 8-in-1 pan that replaces your frying pan, saucepan, steamer and more",
    longDescription: "Cook together with the pan that does it all. The Always Pan 2.0 replaces 8 pieces of cookware — fry, sauté, steam, braise, boil, sear, strain and store. Non-toxic ceramic coating with a built-in spatula rest.",
    features: ["8-in-1 functionality", "Non-toxic ceramic coating", "Built-in spatula rest", "Includes steamer basket"],
    category: "Home",
    imageUrl: "https://m.media-amazon.com/images/I/61R6toYDl3L.jpg",
    images: ["https://m.media-amazon.com/images/I/61R6toYDl3L.jpg"],
    productUrl: "https://fromourplace.co.uk/products/always-pan",
    sizing: {
      type: "colour",
      options: ["Char (dark grey)", "Steam (pale blue)", "Sage (green)", "Terracotta", "Lavender"],
      guide: "26.5cm diameter. Oven-safe to 230°C."
    },
    materials: "Aluminium body, non-toxic ceramic coating, stainless steel handle, beechwood spatula rest",
    dimensions: "26.5cm diameter × 7.5cm depth",
    whatsIncluded: ["Always Pan 2.0", "Stainless steel steamer basket", "Beechwood spatula"],
    careInstructions: "Hand wash recommended. Avoid metal utensils on ceramic surface. Oven-safe to 230°C."
  },
  {
    name: "Linen Duvet Cover Set",
    brand: "Piglet in Bed",
    price: "£195.00",
    description: "100% European flax linen bedding — breathable, beautiful, gets softer with every wash",
    longDescription: "Transform your bedroom with Piglet in Bed's signature stonewashed linen. Woven from 100% European flax, it's naturally temperature-regulating, hypoallergenic, and develops a beautiful lived-in softness over time. Available in gorgeous colours.",
    features: ["100% European flax linen", "Stonewashed for softness", "Temperature-regulating", "Oeko-Tex certified"],
    category: "Home",
    imageUrl: "https://us.pigletinbed.com/cdn/shop/files/100_-LINEN-PLAIN-OATMEAL-OVERHEAD-LIFESTYLEcopy2_400x.jpg?v=1760718761",
    images: ["https://us.pigletinbed.com/cdn/shop/files/100_-LINEN-PLAIN-OATMEAL-OVERHEAD-LIFESTYLEcopy2_400x.jpg?v=1760718761"],
    productUrl: "https://www.pigletinbed.com/collections/linen-duvet-covers",
    sizing: {
      type: "size",
      options: ["Single (135 × 200cm)", "Double (200 × 200cm)", "King (230 × 220cm)", "Super King (260 × 220cm)"],
      guide: "Each set includes 1 duvet cover + 2 pillowcases (1 for Single). Stonewashed — no need to iron."
    },
    materials: "100% European flax linen, 165gsm, Oeko-Tex Standard 100 certified",
    whatsIncluded: ["Linen duvet cover", "2 linen pillowcases (1 for Single)"],
    careInstructions: "Machine wash at 40°C. Tumble dry on low or hang to dry. Gets softer with every wash — no ironing needed."
  },
  {
    name: "Reed Diffuser Duo",
    brand: "Neom Organics",
    price: "£68.00",
    description: "Set of 2 organic reed diffusers — one for the bedroom, one for the living room",
    longDescription: "Fill your home with beautiful, natural fragrance. This duo includes Neom's bestselling 'Complete Bliss' (Moroccan rose, lime & black pepper) and 'Real Luxury' (lavender, jasmine & Brazilian rosewood). Each lasts up to 12 weeks.",
    features: ["2 × 100ml diffusers", "100% natural fragrance", "Up to 12 weeks each", "Organic essential oils"],
    category: "Home",
    imageUrl: "https://neomwellbeing.com/cdn/shop/files/Happiness_Rosy_Home_Fragrance_Duo.jpg?v=1771417140&width=800",
    images: ["https://neomwellbeing.com/cdn/shop/files/Happiness_Rosy_Home_Fragrance_Duo.jpg?v=1771417140&width=800"],
    productUrl: "https://www.neomorganics.com/collections/reed-diffusers",
    sizing: { type: "volume", options: ["2 × 100ml"] },
    materials: "100% natural fragrance from organic essential oils, rattan reeds, glass vessels",
    dimensions: "Each: 100ml glass vessel, 19cm with reeds",
    whatsIncluded: ["Complete Bliss diffuser + reeds", "Real Luxury diffuser + reeds", "Gift box"],
    careInstructions: "Flip reeds weekly for stronger fragrance. Keep away from heat sources and direct sunlight."
  },
];
