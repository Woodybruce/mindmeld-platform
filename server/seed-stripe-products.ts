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
  {
    name: "Roseravished Massage Oil — Coco de Mer",
    brand: "Coco de Mer",
    description: "Luxurious rose-scented sensual massage oil with neroli and ylang ylang",
    priceGBP: 5400,
    category: "Massage",
    shopProductName: "Roseravished Massage Oil",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Roseravished-Massage-Oil_1024x.png?v=1752055199",
  },
  {
    name: "Enraptured Figment Massage Candle — Coco de Mer",
    brand: "Coco de Mer",
    description: "Hand-poured candle that melts into warm, fragrant massage oil",
    priceGBP: 6000,
    category: "Candles",
    shopProductName: "Enraptured Figment Massage Candle",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Coco-de-Mer-Enraptured-Figment-Massage-Candle_1024x.png?v=1752078889",
  },
];

async function seedProducts() {
  console.log("Starting Stripe product seed...");
  const stripe = await getUncachableStripeClient();

  for (const def of PRODUCTS_TO_SEED) {
    const existing = await stripe.products.search({ query: `name:'${def.name}'` });
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
