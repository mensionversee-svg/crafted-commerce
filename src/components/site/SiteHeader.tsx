import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Search, ShoppingBag, User, Menu, X, LayoutDashboard, Package } from "lucide-react";
import { useState } from "react";
import { useAuth, useCart } from "@/lib/store";

export function SiteHeader() {
  const { count } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/shop", search: { q: q || undefined, cat: undefined, sort: undefined } });
    setOpen(false);
  };

  const links = (
    <>
      <Link to="/shop" search={{}} className="hover:text-primary transition-colors" activeProps={{ className: "text-primary" }}>Shop</Link>
      <Link to="/shop" search={{ cat: "audio" }} className="hover:text-primary transition-colors">Audio</Link>
      <Link to="/shop" search={{ cat: "watches" }} className="hover:text-primary transition-colors">Watches</Link>
      <Link to="/shop" search={{ cat: "bags" }} className="hover:text-primary transition-colors">Bags</Link>
      <Link to="/shop" search={{ cat: "home" }} className="hover:text-primary transition-colors">Home</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <Link to="/" className="font-display text-3xl tracking-tight">AUREL</Link>
        <nav className="ml-6 hidden gap-6 text-sm md:flex">{links}</nav>
        <form onSubmit={submit} className="ml-auto hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 lg:flex">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="w-48 bg-transparent text-sm outline-none" />
        </form>
        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          {isAdmin && (
            <Link to="/admin" className="rounded-full p-2 hover:bg-muted" aria-label="Admin"><LayoutDashboard className="size-5" /></Link>
          )}
          <Link to="/wishlist" className="rounded-full p-2 hover:bg-muted" aria-label="Wishlist"><Heart className="size-5" /></Link>
          {user && <Link to="/orders" className="rounded-full p-2 hover:bg-muted" aria-label="Orders"><Package className="size-5" /></Link>}
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-muted" aria-label="Cart">
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{count}</span>
            )}
          </Link>
          {user ? (
            <button onClick={signOut} className="ml-1 hidden rounded-full border px-3 py-1.5 text-xs hover:bg-muted sm:block">Sign out</button>
          ) : (
            <Link to="/auth" search={{}} className="rounded-full p-2 hover:bg-muted" aria-label="Sign in"><User className="size-5" /></Link>
          )}
        </div>
      </div>
      {open && (
        <div className="border-t px-4 pb-4 md:hidden">
          <form onSubmit={submit} className="my-3 flex items-center gap-2 rounded-full border bg-card px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="w-full bg-transparent text-sm outline-none" />
          </form>
          <nav className="flex flex-col gap-3 text-sm" onClick={() => setOpen(false)}>
            {links}
            {user && <button onClick={signOut} className="text-left text-muted-foreground">Sign out</button>}
          </nav>
        </div>
      )}
    </header>
  );
}
