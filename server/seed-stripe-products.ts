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
  { name: "Pure Delight Orgasm Balm — Coco de Mer", brand: "Coco de Mer", description: "Sensation-heightening intimate balm with natural botanicals", priceGBP: 3600, category: "Wellness", shopProductName: "Pure Delight Orgasm Balm", imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Pure-Delight-Orgasm-Balm_1024x.png?v=1752225275" },
  { name: "G.Tox Detox Bath Soak — goop", brand: "goop", description: "Purifying bath soak with Himalayan salt and activated charcoal", priceGBP: 4500, category: "Wellness", shopProductName: "G.Tox Detox Bath Soak", imageUrl: "https://static.thcdn.com/productimg/original/13310780-6404896412642401.jpg" },
  { name: "The Martini Bath Soak — goop", brand: "goop", description: "Emotional detox bath soak with CBD and botanicals", priceGBP: 4200, category: "Wellness", shopProductName: "The Martini Bath Soak", imageUrl: "https://static.thcdn.com/productimg/original/13310784-1444896412756539.jpg" },
  { name: "Augustinus Bader The Cream — Space NK", brand: "Space NK", description: "Award-winning face cream with TFC8 cell-renewing technology", priceGBP: 19800, category: "Wellness", shopProductName: "Augustinus Bader The Cream", imageUrl: "https://www.beautyhabit.com/cdn/shop/files/45555-5-min.jpg?v=1749140382&width=1200" },
  { name: "SONA 2 Cruise — LELO", brand: "LELO", description: "Sonic clitoral massager with Cruise Control technology", priceGBP: 13900, category: "Wellness", shopProductName: "SONA 2 Cruise", imageUrl: "https://static.thcdn.com/productimg/original/12669854-1544930111945017.jpg" },

  { name: "Silk Blindfold — Coco de Mer", brand: "Coco de Mer", description: "Hand-finished mulberry silk blindfold for sensory exploration", priceGBP: 10200, category: "Intimacy", shopProductName: "Silk Blindfold", imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco_de_Mer_Silk_Blindfold_1024x.png?v=1751638173" },
  { name: "TIANI 3 — LELO", brand: "LELO", description: "Remote-controlled couples' massager worn during intimacy", priceGBP: 16900, category: "Intimacy", shopProductName: "TIANI 3", imageUrl: "https://static.thcdn.com/productimg/1600/1600/12669865-2634791714156570.jpg" },
  { name: "Gia Bodysuit — Sophie & Olivia", brand: "Sophie & Olivia", description: "Sculpted mesh bodysuit with strategic boning and plunge front", priceGBP: 10700, category: "Intimacy", shopProductName: "Gia Bodysuit", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame129_1_1024x1024.png?v=1771861708" },
  { name: "Noa Slip Dress — Sophie & Olivia", brand: "Sophie & Olivia", description: "Luxurious satin slip dress for lounging or layering", priceGBP: 6400, category: "Intimacy", shopProductName: "Noa Slip Dress", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame570.png?v=1772032819&width=1024" },
  { name: "Charlotte Lingerie Set — Sophie & Olivia", brand: "Sophie & Olivia", description: "Three-piece set with guêpière, string and thigh bands", priceGBP: 8900, category: "Intimacy", shopProductName: "Charlotte Lingerie Set", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/ensemble-trois-pieces-guepiere-string-tours-de-cuisses-confess-noir-175205_9872ca1f-0740-447f-88b1-24b9ab306c37.png?v=1756387842&width=1024" },
  { name: "Celeste Quarter Cup Bra — Coco de Mer", brand: "Coco de Mer", description: "Hand-crafted French lace quarter-cup bra in midnight blue", priceGBP: 23400, category: "Intimacy", shopProductName: "Celeste Quarter Cup Bra", imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Celestequartercupbrafront_d56f88d8-1b80-4ba6-ba50-bbc63c0c4a61_1024x.png?v=1767111157" },

  { name: "Edition 04 Orchard Eau de Parfum — goop", brand: "goop", description: "Warm, woody unisex fragrance with fig and sandalwood", priceGBP: 10800, category: "Gifts", shopProductName: "Edition 04 Orchard Eau de Parfum", imageUrl: "https://static.thcdn.com/productimg/original/13317640-8414896456928977.jpg" },
  { name: "Baccarat Rouge 540 Eau de Parfum — Space NK", brand: "Space NK", description: "The iconic Maison Francis Kurkdjian fragrance", priceGBP: 31200, category: "Gifts", shopProductName: "Baccarat Rouge 540 Eau de Parfum", imageUrl: "https://www.smallflower.com/cdn/shop/products/ProductListings-BaccaratRouge540EaudeParfum_70ml.png" },
  { name: "Hosiery Gift Set — Agent Provocateur", brand: "Agent Provocateur", description: "Signature hold-ups and suspender set in gift packaging", priceGBP: 7800, category: "Gifts", shopProductName: "Hosiery Gift Set", imageUrl: "https://m.media-amazon.com/images/I/71cCmV5J50L.jpg" },
  { name: "Lip & Cheek Duo — Space NK", brand: "Space NK", description: "Buildable cream colour for a natural, flushed glow", priceGBP: 4200, category: "Gifts", shopProductName: "Lip & Cheek Duo", imageUrl: "https://picknpamper.com/wp-content/uploads/2025/06/s2843258-av-3-zoom.jpg" },
  { name: "Jo Malone Wood Sage & Sea Salt Cologne", brand: "Jo Malone", description: "Fresh, mineral unisex fragrance inspired by wind-swept coastlines", priceGBP: 11800, category: "Gifts", shopProductName: "Jo Malone Wood Sage & Sea Salt Cologne", imageUrl: "https://images-na.ssl-images-amazon.com/images/I/61nj0JW-gyL.jpg" },
  { name: "Personalised Star Map Print — Under Lucky Stars", brand: "Under Lucky Stars", description: "Custom map of the night sky from your special date and location", priceGBP: 6500, category: "Gifts", shopProductName: "Personalised Star Map Print", imageUrl: "https://d81e40b6.delivery.rocketcdn.me/wp-content/uploads/2020/03/underluckystars07-800x1067.jpg" },

  { name: "Enraptured Figment Massage Candle — Coco de Mer", brand: "Coco de Mer", description: "Hand-poured candle that melts into warm, fragrant massage oil", priceGBP: 6000, category: "Date Night", shopProductName: "Enraptured Figment Massage Candle", imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Coco-de-Mer-Enraptured-Figment-Massage-Candle_1024x.png?v=1752078889" },
  { name: "Scented Candle: Edition 04 Orchard — goop", brand: "goop", description: "Hand-poured coconut wax candle with fig, orchard fruit and cedarwood", priceGBP: 5800, category: "Date Night", shopProductName: "Scented Candle: Edition 04 Orchard", imageUrl: "https://static.thcdn.com/productimg/original/13310790-2014896412930473.jpg" },
  { name: "Couples Conversation Card Game — The School of Life", brand: "The School of Life", description: "100 meaningful questions to deepen your connection", priceGBP: 1800, category: "Date Night", shopProductName: "Couples Conversation Card Game", imageUrl: "https://m.media-amazon.com/images/I/61IN2spijzL.jpg" },
  { name: "Cocktail Smoker Kit — Aged & Charred", brand: "Aged & Charred", description: "Smoke cocktails together with real wood chips — oak, cherry, apple and hickory", priceGBP: 5500, category: "Date Night", shopProductName: "Cocktail Smoker Kit", imageUrl: "https://m.media-amazon.com/images/I/61J0ZKdP0CL.jpg" },
  { name: "Fondue Set for Two — Le Creuset", brand: "Le Creuset", description: "Cast iron mini fondue set in iconic Le Creuset colours", priceGBP: 8500, category: "Date Night", shopProductName: "Fondue Set for Two", imageUrl: "https://admin.azuramart.com/media/images/products/1073/prod_05102021_615c059d18d7d.png" },
  { name: "Diptyque Baies Candle", brand: "Diptyque", description: "The iconic blackcurrant and rose candle — a date night essential", priceGBP: 5600, category: "Date Night", shopProductName: "Diptyque Baies Candle", imageUrl: "https://escentials.com/cdn/shop/products/escentials_B70V_1_110x110_crop_center.jpg?v=1649407425" },

  { name: "Our Place Night & Day Glasses", brand: "Our Place", description: "Set of 4 hand-blown borosilicate glasses — perfect for wine nights in", priceGBP: 4500, category: "Home", shopProductName: "Our Place Night & Day Glasses", imageUrl: "https://mocastore.org/cdn/shop/files/Night_Day_Glasses_Sunset_4_1024x1024.jpg?v=1743875341" },
  { name: "Cashmere Bed Socks — The White Company", brand: "The White Company", description: "Sumptuously soft pure cashmere socks — the ultimate cosy-night-in luxury", priceGBP: 4500, category: "Home", shopProductName: "Cashmere Bed Socks", imageUrl: "https://i.guim.co.uk/img/media/64d38e434f44ab760cfb572bc759a97f7d150a6f/386_214_4227_2536/master/4227.jpg?width=445&dpr=1&s=none&crop=none" },
  { name: "Luxury Faux Fur Throw — The White Company", brand: "The White Company", description: "Ultra-soft faux fur throw — transform your sofa into a couples' sanctuary", priceGBP: 14900, category: "Home", shopProductName: "Luxury Faux Fur Throw", imageUrl: "https://cdn.mos.cms.futurecdn.net/PmBPT7m66MSSuLZaBG2jV8.jpg" },
  { name: "Always Pan 2.0 — Our Place", brand: "Our Place", description: "The iconic 8-in-1 pan that replaces your frying pan, saucepan, steamer and more", priceGBP: 12500, category: "Home", shopProductName: "Always Pan 2.0", imageUrl: "https://m.media-amazon.com/images/I/61R6toYDl3L.jpg" },
  { name: "Linen Duvet Cover Set — Piglet in Bed", brand: "Piglet in Bed", description: "100% European flax linen bedding — breathable, beautiful, gets softer with every wash", priceGBP: 19500, category: "Home", shopProductName: "Linen Duvet Cover Set", imageUrl: "https://us.pigletinbed.com/cdn/shop/files/100_-LINEN-PLAIN-OATMEAL-OVERHEAD-LIFESTYLEcopy2_400x.jpg?v=1760718761" },
  { name: "Reed Diffuser Duo — Neom Organics", brand: "Neom Organics", description: "Set of 2 organic reed diffusers — one for the bedroom, one for the living room", priceGBP: 6800, category: "Home", shopProductName: "Reed Diffuser Duo", imageUrl: "https://neomwellbeing.com/cdn/shop/files/Happiness_Rosy_Home_Fragrance_Duo.jpg?v=1771417140&width=800" },
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
      currency: 'gbp',
    });

    console.log(`  [created] "${def.name}" @ £${(def.priceGBP / 100).toFixed(2)}`);
  }

  console.log("Seed complete.");
}

seedProducts().catch(console.error);
