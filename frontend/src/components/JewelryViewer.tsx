import { useMemo, useState } from "react";
import type { Category, DiamondSize, Karat, MetalColor } from "@/lib/products";

interface Props {
  category: Category;
  metalColor: MetalColor;
  diamondSize: DiamondSize;
  karat: Karat;
}

const SKETCHFAB_MODELS: Record<Category, { title: string; embedUrl: string }> = {
  Rings: {
    title: "Sketchfab ring model",
    embedUrl:
      "https://sketchfab.com/models/643e5e0289dc433f84f3a2accd7571af/embed?autostart=1&transparent=1&ui_infos=0&ui_controls=1&ui_watermark=0",
  },
  Necklaces: {
    title: "Sketchfab necklace model",
    embedUrl:
      "https://sketchfab.com/models/40509546dc084521a0d4e7da5dd9bfe6/embed?autostart=1&transparent=1&ui_infos=0&ui_controls=1&ui_watermark=0",
  },
  Earrings: {
    title: "Gold Earrings",
    embedUrl:
      "https://sketchfab.com/models/fa51411b736a4306889e197226f1b806/embed?autostart=1&transparent=1&ui_infos=0&ui_controls=1&ui_watermark=0",
  },
  Bracelets: {
    title: "Bracelet 1 (Rose)",
    embedUrl:
      "https://sketchfab.com/models/f6c11eb4147d4b7794b53002c7aae288/embed?autostart=1&transparent=1&ui_infos=0&ui_controls=1&ui_watermark=0",
  },
};

const METAL_LABELS: Record<MetalColor, string> = {
  "Yellow Gold": "Yellow gold",
  "Rose Gold": "Rose gold",
  Silver: "Silver",
};

const GEM_LABELS: Record<DiamondSize, string> = {
  "0.25 ct": "Small stone",
  "0.50 ct": "Medium stone",
  "0.75 ct": "Large stone",
  "1.00 ct": "Premium stone",
};

const KARAT_LABELS: Record<Karat, string> = {
  "14K": "14 karat",
  "18K": "18 karat",
  "22K": "22 karat",
};

export function JewelryViewer({ category, metalColor, diamondSize, karat }: Props) {
  const model = useMemo(() => SKETCHFAB_MODELS[category], [category]);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,248,238,0.98),rgba(243,234,223,0.92)_45%,rgba(229,214,196,0.88)_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0))]" />

      <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 text-[10px] tracking-luxury uppercase">
        <span className="rounded-full bg-background/85 px-3 py-1.5 text-foreground/75 backdrop-blur-sm">
          {model.title}
        </span>
        <span className="rounded-full bg-background/85 px-3 py-1.5 text-foreground/55 backdrop-blur-sm">
          {METAL_LABELS[metalColor]}
        </span>
        <span className="rounded-full bg-background/85 px-3 py-1.5 text-foreground/55 backdrop-blur-sm">
          {GEM_LABELS[diamondSize]}
        </span>
        <span className="rounded-full bg-background/85 px-3 py-1.5 text-foreground/55 backdrop-blur-sm">
          {KARAT_LABELS[karat]}
        </span>
      </div>

      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-full border border-foreground/10 bg-background/85 px-4 py-2 text-[10px] tracking-[0.28em] uppercase text-foreground/65 backdrop-blur-sm">
            Loading Sketchfab model...
          </div>
        </div>
      )}

      <iframe
        key={model.embedUrl}
        src={model.embedUrl}
        title={model.title}
        className="absolute inset-0 h-full w-full border-0"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-4 text-[10px] tracking-luxury uppercase text-foreground/55">
        <span className="rounded-full bg-background/75 px-2 py-1 backdrop-blur-sm">Drag to rotate</span>
        <span className="rounded-full bg-background/75 px-2 py-1 backdrop-blur-sm">Hosted on Sketchfab</span>
      </div>
    </div>
  );
}