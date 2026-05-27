import { Suspense, lazy, useState } from "react";
import { products, type Product } from "@/lib/products";
import { ProductCard } from "./ProductCard";

const ProductModal = lazy(() =>
  import("./ProductModal").then((module) => ({ default: module.ProductModal })),
);

export function ProductGrid() {
  const [active, setActive] = useState<Product | null>(null);

  return (
    <section id="shop" className="mx-auto max-w-7xl px-6 lg:px-10 py-20 md:py-28 border-t border-border/60">
      <div className="text-center mb-12 md:mb-16">
        <p className="text-[11px] tracking-luxury uppercase text-gold mb-3">Curated For You</p>
        <h2 className="font-display text-4xl md:text-5xl text-espresso">New Collection</h2>
        <p className="text-sm text-foreground/60 mt-3 max-w-md mx-auto">
          From dazzling diamonds to lustrous gemstones — a symphony of brilliance and style.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 md:gap-x-6 md:gap-y-14">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onView={setActive} />
        ))}
      </div>

      <Suspense fallback={null}>
        <ProductModal product={active} onClose={() => setActive(null)} />
      </Suspense>
    </section>
  );
}
