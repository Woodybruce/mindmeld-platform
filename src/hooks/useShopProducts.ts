import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

const SHOP_LIST_NAME = "Our Shopping List";
const AMAZON_TAG = "woodybruce-21";

const ensureAffiliateTag = (url: string, productName?: string): string => {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("coco-de-mer.com")) return url;
    if (u.hostname.includes("amazon")) {
      if (u.pathname.includes("/dp/") || u.pathname.includes("/gp/")) {
        return `https://www.amazon.co.uk/s?k=${encodeURIComponent(productName || "couples gift")}&tag=${AMAZON_TAG}`;
      }
      u.searchParams.set("tag", AMAZON_TAG);
    }
    return u.toString();
  } catch {
    if (url.includes("amazon")) {
      return `https://www.amazon.co.uk/s?k=${encodeURIComponent(productName || url)}&tag=${AMAZON_TAG}`;
    }
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
    amazonUrl: "https://www.amazon.co.uk/s?k=Talk+Flirt+Dare+couples+card+game&tag=woodybruce-21",
    active: true,
  },
  {
    name: "100 Dates Scratch-Off Poster",
    brand: "Gift Republic",
    price: "£9.99",
    description: "Scratch off fun date ideas together — from cooking classes to stargazing",
    category: "Date Night",
    imageUrl: "https://m.media-amazon.com/images/I/81xdUHuBbEL._AC_SL1500_.jpg",
    amazonUrl: "https://www.amazon.co.uk/s?k=100+Dates+Scratch+Off+Poster+Gift+Republic&tag=woodybruce-21",
    active: true,
  },
  {
    name: "Couples Wellness Spa Gift Set",
    brand: "ESPA",
    price: "£35.00",
    description: "Luxury bath & body set — perfect for a pamper night in together",
    category: "Wellness",
    imageUrl: "https://m.media-amazon.com/images/I/61Ry3mxZURL._AC_SL1000_.jpg",
    amazonUrl: "https://www.amazon.co.uk/s?k=Couples+Wellness+Spa+Gift+Set&tag=woodybruce-21",
    active: true,
  },
  {
    name: "Personalised Star Map Print",
    brand: "Twinkle In Time",
    price: "£24.99",
    description: "Custom night sky from the date you met — a meaningful keepsake gift",
    category: "Gifts",
    imageUrl: "https://m.media-amazon.com/images/I/61dQKnj3KAL._AC_SL1000_.jpg",
    amazonUrl: "https://www.amazon.co.uk/s?k=Personalised+Star+Map+Print+couples&tag=woodybruce-21",
    active: true,
  },
  {
    name: "Couple's Bucket List Book",
    brand: "Ellie Claire",
    price: "£8.99",
    description: "A guided journal for adventures and experiences you want to share together",
    category: "Gifts",
    imageUrl: "https://m.media-amazon.com/images/I/71L9jz4GxkL._AC_SL1500_.jpg",
    amazonUrl: "https://www.amazon.co.uk/s?k=Couples+Bucket+List+Book+journal&tag=woodybruce-21",
    active: true,
  },
  {
    name: "Romantic Scented Candle Gift Set",
    brand: "Yankee Candle",
    price: "£15.99",
    description: "Set of 3 votives in romantic scents — ideal for date nights at home",
    category: "Date Night",
    imageUrl: "https://m.media-amazon.com/images/I/81Vkq2TNNML._AC_SL1500_.jpg",
    amazonUrl: "https://www.amazon.co.uk/s?k=Yankee+Candle+romantic+scented+gift+set&tag=woodybruce-21",
    active: true,
  },
  {
    name: "Roseravished Massage Candle",
    brand: "Coco de Mer",
    price: "£50.00",
    description: "Luxury candle that melts into sensual warm massage oil — romantic evenings in",
    category: "Intimacy",
    imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Candle_CdM_PINK_Lit.jpg",
    amazonUrl: "https://www.coco-de-mer.com/products/coco-de-mer-roseravished-massage-candle-200g",
    active: true,
  },
  {
    name: "We're Not Really Strangers Card Game",
    brand: "We're Not Really Strangers",
    price: "£24.99",
    description: "Deepen your connection with meaningful questions and wildcards",
    category: "Games",
    imageUrl: "https://m.media-amazon.com/images/I/61ynJ2CVQBL._AC_SL1000_.jpg",
    amazonUrl: "https://www.amazon.co.uk/s?k=Were+Not+Really+Strangers+Card+Game&tag=woodybruce-21",
    active: true,
  },
];

export function useShopProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [listId, setListId] = useState<string | null>(null);
  const seeded = useRef(false);

  const fetchProducts = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("shared_lists")
      .select("*")
      .in("name", [SHOP_LIST_NAME, "__shop_products__"])
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Shop products fetch error:", error);
    }

    if (data) {
      setListId(data.id);
      let items = Array.isArray(data.items) ? data.items as ShopProduct[] : [];
      let needsSave = false;
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      items = items.map(p => {
        if (!p.id || !uuidRe.test(p.id)) {
          needsSave = true;
          return { ...p, id: crypto.randomUUID() };
        }
        return p;
      });
      setProducts(items);
      if (data.name !== SHOP_LIST_NAME || needsSave) {
        await supabase.from("shared_lists").update({ name: SHOP_LIST_NAME, template: "shopping", icon: "🛒", ...(needsSave ? { items: items as any } : {}) }).eq("id", data.id);
      }
    } else if (!error && !seeded.current) {
      seeded.current = true;
      const seedProducts: ShopProduct[] = DEFAULT_PRODUCTS.map(p => ({
        ...p,
        id: crypto.randomUUID(),
        amazonUrl: ensureAffiliateTag(p.amazonUrl, p.name),
      }));
      const { data: inserted, error: insertErr } = await supabase
        .from("shared_lists")
        .insert({ name: SHOP_LIST_NAME, icon: "🛒", template: "shopping", items: seedProducts as any, user_id: user.id })
        .select("id")
        .single();
      if (insertErr) {
        console.error("Shop products seed error:", insertErr);
      }
      if (inserted) {
        setListId(inserted.id);
        setProducts(seedProducts);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const saveProducts = useCallback(async (newProducts: ShopProduct[]) => {
    if (listId) {
      await supabase
        .from("shared_lists")
        .update({ items: newProducts as any })
        .eq("id", listId);
    } else if (user) {
      const { data } = await supabase
        .from("shared_lists")
        .insert({ name: SHOP_LIST_NAME, icon: "🛒", template: "shopping", items: newProducts as any, user_id: user.id })
        .select("id")
        .single();
      if (data) setListId(data.id);
    }
    setProducts(newProducts);
  }, [listId, user]);

  const addProduct = useCallback(async (product: Omit<ShopProduct, "id">) => {
    const newProduct: ShopProduct = {
      ...product,
      id: crypto.randomUUID(),
      amazonUrl: ensureAffiliateTag(product.amazonUrl, product.name),
    };
    const updated = [...products, newProduct];
    await saveProducts(updated);
    return newProduct;
  }, [products, saveProducts]);

  const updateProduct = useCallback(async (id: string, updates: Partial<ShopProduct>) => {
    const updated = products.map(p =>
      p.id === id
        ? { ...p, ...updates, amazonUrl: updates.amazonUrl ? ensureAffiliateTag(updates.amazonUrl, updates.name || p.name) : p.amazonUrl }
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
