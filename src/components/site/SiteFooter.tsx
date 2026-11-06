import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-5xl">AUREL</p>
          <p className="mt-3 max-w-sm text-sm text-ink-muted">Considered objects for slow living. Designed to last, made to be used every day.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-ink-muted uppercase tracking-widest text-xs">Shop</p>
          <Link to="/shop" search={{}} className="block hover:text-primary">All products</Link>
          <Link to="/wishlist" className="block hover:text-primary">Wishlist</Link>
          <Link to="/cart" className="block hover:text-primary">Cart</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-ink-muted uppercase tracking-widest text-xs">Account</p>
          <Link to="/orders" className="block hover:text-primary">Track orders</Link>
          <Link to="/auth" search={{}} className="block hover:text-primary">Sign in</Link>
        </div>
      </div>
      <div className="border-t border-ink-muted/20 py-6 text-center text-xs text-ink-muted">© {new Date().getFullYear()} Aurel Studio. All rights reserved.</div>
    </footer>
  );
}
