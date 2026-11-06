import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type Category = Tables<"categories">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;

export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

export const money = (n: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));

/* ---------- queries ---------- */
export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*").order("created_at");
    if (error) throw error;
    return data;
  },
});
export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

/* ---------- auth ---------- */
type AuthCtx = { user: User | null; isAdmin: boolean; loading: boolean; signOut: () => Promise<void> };
const AuthContext = createContext<AuthCtx>({ user: null, isAdmin: false, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") qc.invalidateQueries({ queryKey: ["me"] });
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  useEffect(() => {
    if (!user) return setIsAdmin(false);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return <AuthContext.Provider value={{ user, isAdmin, loading, signOut }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

/* ---------- cart ---------- */
export type CartItem = { product_id: string; slug: string; name: string; price: number; image_url: string | null; quantity: number; stock: number };
type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (p: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};
const CartContext = createContext<CartCtx | null>(null);
const CART_KEY = "aurel-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartCtx>(() => {
    const clamp = (q: number, stock: number) => Math.max(1, Math.min(q, Math.max(stock, 1)));
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
      add: (p, qty = 1) => {
        if (p.stock <= 0) return void toast.error("Sold out");
        setItems((prev) => {
          const ex = prev.find((i) => i.product_id === p.id);
          if (ex) return prev.map((i) => (i.product_id === p.id ? { ...i, quantity: clamp(i.quantity + qty, p.stock) } : i));
          return [...prev, { product_id: p.id, slug: p.slug, name: p.name, price: Number(p.price), image_url: p.image_url, quantity: clamp(qty, p.stock), stock: p.stock }];
        });
        toast.success(`${p.name} added to cart`);
      },
      setQty: (id, qty) => setItems((prev) => prev.map((i) => (i.product_id === id ? { ...i, quantity: clamp(qty, i.stock) } : i))),
      remove: (id) => setItems((prev) => prev.filter((i) => i.product_id !== id)),
      clear: () => setItems([]),
    };
  }, [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => {
  const c = useContext(CartContext);
  if (!c) throw new Error("CartProvider missing");
  return c;
};

/* ---------- wishlist ---------- */
export function useWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["me", "wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlist").select("product_id");
      if (error) throw error;
      return data.map((d) => d.product_id);
    },
  });
  const ids = user ? (q.data ?? []) : [];
  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Sign in to save items to your wishlist");
      if (ids.includes(productId)) {
        const { error } = await supabase.from("wishlist").delete().eq("product_id", productId).eq("user_id", user.id);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase.from("wishlist").insert({ product_id: productId, user_id: user.id });
      if (error) throw error;
      return true;
    },
    onSuccess: (added) => {
      toast.success(added ? "Saved to wishlist" : "Removed from wishlist");
      qc.invalidateQueries({ queryKey: ["me", "wishlist"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return { ids, has: (id: string) => ids.includes(id), toggle: (id: string) => toggle.mutate(id) };
}
