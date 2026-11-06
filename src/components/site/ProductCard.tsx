import { Link } from "@tanstack/react-router";
import { Heart, Plus, Star } from "lucide-react";
import { motion } from "framer-motion";
import { money, useCart, useWishlist, type Product } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const wl = useWishlist();
  const saved = wl.has(product.id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <div className="relative overflow-hidden rounded-2xl bg-muted">
        <Link to="/product/$slug" params={{ slug: product.slug }}>
          <img src={product.image_url ?? ""} alt={product.name} loading="lazy" width={800} height={1000} className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </Link>
        {product.compare_at_price && <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">Sale</span>}
        {product.stock <= 0 && <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[11px] text-ink-foreground">Sold out</span>}
        <button onClick={() => wl.toggle(product.id)} aria-label="Toggle wishlist" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-card/90 backdrop-blur">
          <Heart className={cn("size-4", saved && "fill-primary text-primary")} />
        </button>
        <button onClick={() => add(product)} aria-label="Add to cart" className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-ink text-ink-foreground shadow-soft transition md:translate-y-14 md:group-hover:translate-y-0">
          <Plus className="size-5" />
        </button>
      </div>
      <Link to="/product/$slug" params={{ slug: product.slug }} className="mt-3 block">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-tight">{product.name}</p>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="size-3 fill-primary text-primary" />{product.rating}</span>
        </div>
        <p className="mt-1 text-sm">
          {money(product.price)}
          {product.compare_at_price && <span className="ml-2 text-muted-foreground line-through">{money(product.compare_at_price)}</span>}
        </p>
      </Link>
    </motion.div>
  );
}

export function ProductGridSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i}><div className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" /><div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-muted" /></div>
      ))}
    </div>
  );
}
