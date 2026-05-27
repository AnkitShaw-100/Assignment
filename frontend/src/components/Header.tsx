import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";

const nav = ["Collections", "Shop", "Lookbook", "About"];

export function Header() {
  const { count, setOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 md:h-20 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl md:text-3xl font-medium text-espresso">
          Orna<span className="text-gold">.</span>
        </Link>

        <nav className="hidden md:flex items-center gap-10 text-xs tracking-luxury uppercase text-foreground/80">
          {nav.map((n) => (
            <a key={n} href="#" className="hover:text-gold transition-colors">{n}</a>
          ))}
        </nav>

        <div className="flex items-center gap-4 md:gap-5">
          <button className="hidden md:block text-foreground/70 hover:text-gold transition" aria-label="Search">
            <Search className="size-4" />
          </button>
          <button
            onClick={() => setOpen(true)}
            className="relative text-foreground/70 hover:text-gold transition"
            aria-label="Cart"
          >
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-2 size-4 rounded-full bg-gold text-[10px] font-medium text-gold-foreground flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <nav className="flex flex-col px-6 py-4 gap-4 text-sm tracking-luxury uppercase">
            {nav.map((n) => (
              <a key={n} href="#" onClick={() => setMobileOpen(false)} className="py-1">{n}</a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
