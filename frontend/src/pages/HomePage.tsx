import { useEffect } from "react";

import { CategoryGrid } from "@/components/CategoryGrid";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { ProductGrid } from "@/components/ProductGrid";
import { SiteLayout } from "@/layouts/SiteLayout";

export function HomePage() {
  useEffect(() => {
    document.title = "Orna — Timeless Jewelry, Crafted to Last";
  }, []);

  return (
    <SiteLayout>
      <Hero />
      <Marquee />
      <CategoryGrid />
      <ProductGrid />
    </SiteLayout>
  );
}