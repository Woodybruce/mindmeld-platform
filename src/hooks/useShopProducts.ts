import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ShopProduct {
  id: string;
  name: string;
  brand: string;
  price: string;
  description: string;
  category: string;
  imageUrl: string;
  amazonUrl: string;
  active: boolean;
}

const SHOP_LIST_NAME = "__shop_products__";
const AMAZON_TAG = "woodybruce-21";

const ensureAffiliateTag = (url: string): string => {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("amazon")) {
      u.searchParams.set("tag", AMAZON_TAG);
    }
    return u.toString();
  } catch {
    return url;
  }
};

const DEFAULT_PRODUCTS: Omit<ShopProduct, "id">[] = [
  {
    name: "Couple's Card Game – Talk, Flirt, Dare",
    brand: "Talk, Flirt, Dare",
    price: "£12.99",
    description: "150 conversation cards for date nights — fun questions, flirty dares & deep talks",
    category: "Games",
    imageUrl: "https://m.media-amazon.com/images/I/71KqGN8mBOL._AC_SL1500_.jpg",
    amazonUrl: "https://www.amazon.co.uk/dp/B0BYQ4142J",
    active: true,
  },
  {
    name: "100 Dates Scratch-Off Poster",
    brand: "Gift Republic",
    price: "£9.99",
    description: "Scratch off fun date ideas together — from cooking classes to stargazing",
    category: "Date Night",
    imageUrl: "https://m.media-amazon.com/images/I/81xdUHuBbEL._AC_SL1500_.jpg",
    amazonUrl: "https://www.amazon.co.uk/dp/B07MX6212N",
    active: true,
  },
  {
    name: "Couples Wellness Spa Gift Set",
    brand: "ESPA",
    price: "£35.00",
    description: "Luxury bath & body set — perfect for a pamper night in together",
    category: "Wellness",
    imageUrl: "https://m.media-amazon.com/images/I/61Ry3mxZURL._AC_SL1000_.jpg",
    amazonUrl: "https://www.amazon.co.uk/dp/B08CXWLMFD",
    active: true,
  },
  {
    name: "Personalised Star Map Print",
    brand: "Twinkle In Time",
    price: "£24.99",
    description: "Custom night sky from the date you met — a meaningful keepsake gift",
    category: "Gifts",
    imageUrl: "https://m.media-amazon.com/images/I/61dQKnj3KAL._AC_SL1000_.jpg",
    amazonUrl: "https://www.amazon.co.uk/dp/B08NDRHCFL",
    active: true,
  },
  {
    name: "Couple's Bucket List Book",
    brand: "Ellie Claire",
    price: "£8.99",
    description: "A guided journal for adventures and experiences you want to share together",
    category: "Gifts",
    imageUrl: "https://m.media-amazon.com/images/I/71L9jz4GxkL._AC_SL1500_.jpg",
    amazonUrl: "https://www.amazon.co.uk/dp/1633360245",
    active: true,
  },
  {
    name: "Romantic Scented Candle Gift Set",
    brand: "Yankee Candle",
    price: "£15.99",
    description: "Set of 3 votives in romantic scents — ideal for date nights at home",
    category: "Date Night",
    imageUrl: "https://m.media-amazon.com/images/I/81Vkq2TNNML._AC_SL1500_.jpg",
    amazonUrl: "https://www.amazon.co.uk/dp/B00F3J7070",
    active: true,
  },
  {
    name: "Massage Oil Gift Set for Couples",
    brand: "Puressentiel",
    price: "£18.99",
    description: "Relaxing massage oils set — lavender, ylang ylang & more for couple's massage",
    category: "Intimacy",
    imageUrl: "https://m.media-amazon.com/images/I/61Ry3mxZURL._AC_SL1000_.jpg",
    amazonUrl: "https://www.amazon.co.uk/dp/B01L8GH9S6",
    active: true,
  },
  {
    name: "We're Not Really Strangers Card Game",
    brand: "We're Not Really Strangers",
    price: "£24.99",
    description: "Deepen your connection with meaningful questions and wildcards",
    category: "Games",
    imageUrl: "https://m.media-amazon.com/images/I/61ynJ2CVQBL._AC_SL1000_.jpg",
    amazonUrl: "https://www.amazon.co.uk/dp/B08GSGBY5P",
    active: true,
  },
];

export function useShopProducts() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [listId, setListId] = useState<string | null>(null);
  const seeded = useRef(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shared_lists")
      .select("*")
      .eq("name", SHOP_LIST_NAME)
      .limit(1)
      .maybeSingle();

    if (data) {
      setListId(data.id);
      const items = Array.isArray(data.items) ? data.items as ShopProduct[] : [];
      setProducts(items);
    } else if (!error && !seeded.current) {
      seeded.current = true;
      const seedProducts: ShopProduct[] = DEFAULT_PRODUCTS.map(p => ({
        ...p,
        id: crypto.randomUUID(),
        amazonUrl: ensureAffiliateTag(p.amazonUrl),
      }));
      const { data: inserted } = await supabase
        .from("shared_lists")
        .insert({ name: SHOP_LIST_NAME, icon: "🛍️", items: seedProducts as any })
        .select("id")
        .single();
      if (inserted) {
        setListId(inserted.id);
        setProducts(seedProducts);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const saveProducts = useCallback(async (newProducts: ShopProduct[]) => {
    if (listId) {
      await supabase
        .from("shared_lists")
        .update({ items: newProducts as any })
        .eq("id", listId);
    } else {
      const { data } = await supabase
        .from("shared_lists")
        .insert({ name: SHOP_LIST_NAME, icon: "🛍️", items: newProducts as any })
        .select("id")
        .single();
      if (data) setListId(data.id);
    }
    setProducts(newProducts);
  }, [listId]);

  const addProduct = useCallback(async (product: Omit<ShopProduct, "id">) => {
    const newProduct: ShopProduct = {
      ...product,
      id: crypto.randomUUID(),
      amazonUrl: ensureAffiliateTag(product.amazonUrl),
    };
    const updated = [...products, newProduct];
    await saveProducts(updated);
    return newProduct;
  }, [products, saveProducts]);

  const updateProduct = useCallback(async (id: string, updates: Partial<ShopProduct>) => {
    const updated = products.map(p =>
      p.id === id
        ? { ...p, ...updates, amazonUrl: updates.amazonUrl ? ensureAffiliateTag(updates.amazonUrl) : p.amazonUrl }
        : p
    );
    await saveProducts(updated);
  }, [products, saveProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    const updated = products.filter(p => p.id !== id);
    await saveProducts(updated);
  }, [products, saveProducts]);

  const getActiveProducts = useCallback((category?: string) => {
    let active = products.filter(p => p.active);
    if (category && category !== "all") {
      active = active.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    return active;
  }, [products]);

  return { products, loading, addProduct, updateProduct, deleteProduct, getActiveProducts, fetchProducts };
}
