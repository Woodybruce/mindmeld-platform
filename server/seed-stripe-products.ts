import { getUncachableStripeClient } from './stripeClient';

interface ProductDef {
  name: string;
  brand: string;
  description: string;
  priceGBP: number;
  category: string;
  imageUrl?: string;
  shopProductName: string;
}

const PRODUCTS_TO_SEED: ProductDef[] = [
  { name: "Roseravished Massage Oil — Coco de Mer", brand: "Coco de Mer", description: "Luxurious rose-scented sensual massage oil with neroli and ylang ylang", priceGBP: 5400, category: "Wellness", shopProductName: "Roseravished Massage Oil", imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Roseravished-Massage-Oil_1024x.png?v=1752055199" },
  { name: "Enraptured Figment Massage Candle — Coco de Mer", brand: "Coco de Mer", description: "Hand-poured candle that melts into warm, fragrant massage oil", priceGBP: 6000, category: "Date Night", shopProductName: "Enraptured Figment Massage Candle", imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Coco-de-Mer-Enraptured-Figment-Massage-Candle_1024x.png?v=1752078889" },
  { name: "Pure Delight Orgasm Balm — Coco de Mer", brand: "Coco de Mer", description: "Sensation-heightening intimate balm with natural botanicals", priceGBP: 3600, category: "Wellness", shopProductName: "Pure Delight Orgasm Balm", imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Pure-Delight-Orgasm-Balm_1024x.png?v=1752225275" },
  { name: "Silk Blindfold — Coco de Mer", brand: "Coco de Mer", description: "Hand-finished mulberry silk blindfold for sensory exploration", priceGBP: 10200, category: "Intimacy", shopProductName: "Silk Blindfold", imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco_de_Mer_Silk_Blindfold_1024x.png?v=1751638173" },
  { name: "Celeste Quarter Cup Bra — Coco de Mer", brand: "Coco de Mer", description: "Hand-crafted French lace quarter-cup bra in midnight blue", priceGBP: 23400, category: "Intimacy", shopProductName: "Celeste Quarter Cup Bra", imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Celestequartercupbrafront_d56f88d8-1b80-4ba6-ba50-bbc63c0c4a61_1024x.png?v=1767111157" },
  { name: "Reina Playsuit — Coco de Mer", brand: "Coco de Mer", description: "Exquisite silk and Chantilly lace bodysuit", priceGBP: 46200, category: "Intimacy", shopProductName: "Reina Playsuit", imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/ReinaPlaysuitFront-ezgif.com-resize_1024x.png?v=1765557415" },
  { name: "Divine Glow Lubricant — Coco de Mer", brand: "Coco de Mer", description: "Premium water-based lubricant with hyaluronic acid", priceGBP: 4200, category: "Wellness", shopProductName: "Divine Glow Lubricant", imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Divine-Glow-Aqua-Lubricant_1024x.png?v=1751636529" },
  { name: "Mercy Corset — Agent Provocateur", brand: "Agent Provocateur", description: "Iconic structured corset with signature pink detailing", priceGBP: 54000, category: "Intimacy", shopProductName: "Mercy Corset" },
  { name: "Lorna Plunge Underwired Bra — Agent Provocateur", brand: "Agent Provocateur", description: "Silk and lace plunge bra with scalloped edges", priceGBP: 10800, category: "Intimacy", shopProductName: "Lorna Plunge Underwired Bra" },
  { name: "Keia Silk Kimono — Agent Provocateur", brand: "Agent Provocateur", description: "Floor-length silk kimono with hand-painted floral print", priceGBP: 34800, category: "Intimacy", shopProductName: "Keia Silk Kimono" },
  { name: "Hosiery Gift Set — Agent Provocateur", brand: "Agent Provocateur", description: "Signature hold-ups and suspender set in gift packaging", priceGBP: 7800, category: "Gifts", shopProductName: "Hosiery Gift Set" },
  { name: "G.Spot Vibrator — goop", brand: "goop", description: "Double-ended personal massager in medical-grade silicone", priceGBP: 9000, category: "Wellness", shopProductName: "G.Spot Vibrator" },
  { name: "Scented Candle: Edition 04 Orchard — goop", brand: "goop", description: "Hand-poured coconut wax candle with fig, orchard fruit and cedarwood", priceGBP: 5800, category: "Date Night", shopProductName: "Scented Candle: Edition 04 Orchard", imageUrl: "https://static.thcdn.com/productimg/original/13310790-2014896412930473.jpg" },
  { name: "Edition 04 Orchard Eau de Parfum — goop", brand: "goop", description: "Warm, woody unisex fragrance with fig and sandalwood", priceGBP: 10800, category: "Gifts", shopProductName: "Edition 04 Orchard Eau de Parfum", imageUrl: "https://static.thcdn.com/productimg/original/13317640-8414896456928977.jpg" },
  { name: "G.Tox Detox Bath Soak — goop", brand: "goop", description: "Purifying bath soak with Himalayan salt and activated charcoal", priceGBP: 4500, category: "Wellness", shopProductName: "G.Tox Detox Bath Soak", imageUrl: "https://static.thcdn.com/productimg/original/13310780-6404896412642401.jpg" },
  { name: "The Martini Bath Soak — goop", brand: "goop", description: "Emotional detox bath soak with CBD and botanicals", priceGBP: 4200, category: "Wellness", shopProductName: "The Martini Bath Soak", imageUrl: "https://static.thcdn.com/productimg/original/13310784-1444896412756539.jpg" },
  { name: "Lip & Cheek Duo — Space NK", brand: "Space NK", description: "Buildable cream colour for a natural, flushed glow", priceGBP: 4200, category: "Wellness", shopProductName: "Lip & Cheek Duo", imageUrl: "https://milkmakeup.com/cdn/shop/products/SHOT05_MINILIP_CHEEK_OPEN_DASH_533x.jpg?v=1737741718" },
  { name: "Baccarat Rouge 540 Eau de Parfum — Space NK", brand: "Space NK", description: "The iconic Maison Francis Kurkdjian fragrance", priceGBP: 31200, category: "Gifts", shopProductName: "Baccarat Rouge 540 Eau de Parfum" },
  { name: "SONA 2 Cruise — LELO", brand: "LELO", description: "Sonic clitoral massager with Cruise Control technology", priceGBP: 13900, category: "Wellness", shopProductName: "SONA 2 Cruise", imageUrl: "https://static.thcdn.com/productimg/original/12669854-1544930111945017.jpg" },
  { name: "TIANI 3 — LELO", brand: "LELO", description: "Remote-controlled couples' massager worn during intimacy", priceGBP: 16900, category: "Intimacy", shopProductName: "TIANI 3", imageUrl: "https://static.thcdn.com/productimg/1600/1600/12669865-2634791714156570.jpg" },
  { name: "Desire Luxury G-Spot Vibrator — Lovehoney", brand: "Lovehoney", description: "Rechargeable curved vibrator with 20 patterns and storage case", priceGBP: 4999, category: "Wellness", shopProductName: "Desire Luxury G-Spot Vibrator", imageUrl: "https://m.media-amazon.com/images/I/41tvtOkCVbL._SL500_.jpg" },
  { name: "Augustinus Bader The Cream — Space NK", brand: "Space NK", description: "Award-winning face cream with TFC8 cell-renewing technology", priceGBP: 19800, category: "Wellness", shopProductName: "Augustinus Bader The Cream" },
  { name: "Daisy Lingerie Set — Sophie & Olivia", brand: "Sophie & Olivia", description: "Delicate floral-inspired lingerie set with hand-finished lace", priceGBP: 9500, category: "Intimacy", shopProductName: "Daisy Lingerie Set", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame187_1024x1024.png?v=1771671712" },
  { name: "Gia Bodysuit — Sophie & Olivia", brand: "Sophie & Olivia", description: "Sculpted mesh bodysuit with strategic boning and plunge front", priceGBP: 10700, category: "Intimacy", shopProductName: "Gia Bodysuit", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame129_1_1024x1024.png?v=1771861708" },
  { name: "Joyce 4-Piece Set — Sophie & Olivia", brand: "Sophie & Olivia", description: "Complete luxury lingerie set with bra, brief, thong and suspender", priceGBP: 10700, category: "Intimacy", shopProductName: "Joyce 4-Piece Set", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame78_1024x1024.png?v=1771528463" },
  { name: "Jade 3-Piece Set — Sophie & Olivia", brand: "Sophie & Olivia", description: "Elegant three-piece lingerie set in delicate sheer fabric", priceGBP: 7400, category: "Intimacy", shopProductName: "Jade 3-Piece Set", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame93.png?v=1771670560&width=1024" },
  { name: "Magda Lingerie Set — Sophie & Olivia", brand: "Sophie & Olivia", description: "Romantic white lace lingerie set with a classic silhouette", priceGBP: 7400, category: "Intimacy", shopProductName: "Magda Lingerie Set", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_511.png?v=1771857683&width=1024" },
  { name: "Noa Slip Dress — Sophie & Olivia", brand: "Sophie & Olivia", description: "Luxurious satin slip dress for lounging or layering", priceGBP: 6400, category: "Intimacy", shopProductName: "Noa Slip Dress", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame570.png?v=1772032819&width=1024" },
  { name: "Amber Lingerie Set — Sophie & Olivia", brand: "Sophie & Olivia", description: "Bold and sensual lingerie set with cut-out detailing", priceGBP: 6900, category: "Intimacy", shopProductName: "Amber Lingerie Set", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_700.png?v=1772031000&width=1024" },
  { name: "Celeste Bodysuit — Sophie & Olivia", brand: "Sophie & Olivia", description: "Sleek bodysuit with sheer panels and lace trim", priceGBP: 6000, category: "Intimacy", shopProductName: "Celeste Bodysuit", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_827.png?v=1772032365&width=1024" },
  { name: "Charlotte Lingerie Set — Sophie & Olivia", brand: "Sophie & Olivia", description: "Three-piece set with guêpière, string and thigh bands", priceGBP: 8900, category: "Intimacy", shopProductName: "Charlotte Lingerie Set", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/ensemble-trois-pieces-guepiere-string-tours-de-cuisses-confess-noir-175205_9872ca1f-0740-447f-88b1-24b9ab306c37.png?v=1756387842&width=1024" },
  { name: "Aria Lingerie Set — Sophie & Olivia", brand: "Sophie & Olivia", description: "Elegant lingerie set with intricate embroidery and mesh", priceGBP: 7400, category: "Intimacy", shopProductName: "Aria Lingerie Set", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame36.png?v=1771532318&width=1024" },
];

async function seedProducts() {
  console.log("Starting Stripe product seed...");
  const stripe = await getUncachableStripeClient();

  for (const def of PRODUCTS_TO_SEED) {
    const existing = await stripe.products.search({ query: `name:'${def.name.replace(/'/g, "\\'")}'` });
    if (existing.data.length > 0) {
      console.log(`  [skip] "${def.name}" already exists`);
      continue;
    }

    const product = await stripe.products.create({
      name: def.name,
      description: def.description,
      images: def.imageUrl ? [def.imageUrl] : [],
      metadata: {
        brand: def.brand,
        category: def.category,
        shop_product_name: def.shopProductName,
      },
    });

    await stripe.prices.create({
      product: product.id,
      unit_amount: def.priceGBP,
      currency: "gbp",
    });

    console.log(`  [created] "${def.name}" — £${(def.priceGBP / 100).toFixed(2)}`);
  }

  console.log("Seed complete. Webhooks will sync products to the database.");
}

seedProducts().catch(console.error);
