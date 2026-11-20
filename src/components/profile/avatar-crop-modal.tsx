"use client";

import * as React from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Check, Move, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_ZOOM = 4;

interface AvatarCropModalProps {
  imageSrc: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

export function AvatarCropModal({
  imageSrc,
  isOpen,
  onClose,
  onCropComplete,
}: AvatarCropModalProps) {
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(null);

  const imageRef = React.useRef<HTMLImageElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Reset transform state when new image opens
  React.useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  // Ukuran kotak potong di layar. Zoom 100% = seluruh foto terlihat utuh (fit),
  // seperti foto biasa. Zoom di atas 100% memperbesar, geser untuk memilih bagian.
  const viewportSize = 260;
  const sideways = rotation % 180 !== 0;
  const effW = natural ? (sideways ? natural.h : natural.w) : 1;
  const effH = natural ? (sideways ? natural.w : natural.h) : 1;
  const fitScale = natural ? viewportSize / Math.max(effW, effH) : 1; // px layar per px asli
  const fillZoom = natural ? Math.min(MAX_ZOOM, Math.max(effW, effH) / Math.min(effW, effH)) : 1;
  const renderScale = fitScale * scale;

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Crop & generate 256x256 image (hasil sama persis dengan pratinjau)
  const handleCrop = () => {
    const img = imageRef.current;
    if (!img || !natural) return;

    const cropSize = 256;
    const canvas = document.createElement("canvas");
    canvas.width = cropSize;
    canvas.height = cropSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = cropSize / viewportSize;

    // Latar sama dengan kotak pratinjau, supaya area kosong tidak jadi hitam pekat tak terduga
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, cropSize, cropSize);

    ctx.save();
    // Geser (ruang layar) dulu, baru putar
    ctx.translate(cropSize / 2 + position.x * ratio, cropSize / 2 + position.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    const k = renderScale * ratio;
    ctx.drawImage(img, (-natural.w * k) / 2, (-natural.h * k) / 2, natural.w * k, natural.h * k);
    ctx.restore();

    // Export JPEG ringan
    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/20 dark:border-white/10 bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Sesuaikan & Potong Foto</h3>
            <p className="text-[11px] text-muted-foreground">Foto tampil utuh. Perbesar, geser, atau putar jika perlu</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Viewport Area Pemotongan */}
        <div className="flex flex-col items-center justify-center">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative h-[260px] w-[260px] overflow-hidden rounded-3xl bg-zinc-950 border-2 border-teal-500/40 cursor-grab active:cursor-grabbing select-none touch-none shadow-inner"
          >
            {/* Gambar yang digeser */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={imageSrc}
              ref={(el) => {
                imageRef.current = el;
                // Gambar data-URL bisa selesai dimuat sebelum handler onLoad terpasang
                if (el && el.complete && el.naturalWidth > 0) {
                  setNatural((n) =>
                    n && n.w === el.naturalWidth && n.h === el.naturalHeight
                      ? n
                      : { w: el.naturalWidth, h: el.naturalHeight }
                  );
                }
              }}
              src={imageSrc}
              alt="Foto yang akan dipotong"
              draggable={false}
              onLoad={(e) =>
                setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
              }
              className="absolute max-w-none pointer-events-none"
              style={{
                top: "50%",
                left: "50%",
                width: natural ? natural.w : undefined,
                height: natural ? natural.h : undefined,
                opacity: natural ? 1 : 0,
                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${renderScale})`,
              }}
            />

            {/* Circular Mask Guide */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[210px] w-[210px] rounded-full border-2 border-dashed border-white/80 ring-[200px] ring-black/55 shadow-2xl" />
            </div>

            {/* Hint drag */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 text-white/80 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <Move className="h-2.5 w-2.5" />
              <span>Geser untuk atur posisi</span>
            </div>
          </div>
        </div>

        {/* Controls: Zoom & Rotate */}
        <div className="space-y-2.5 pt-1">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3 px-1">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="range"
              min="1"
              max={MAX_ZOOM}
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Putar, isi penuh, reset */}
          <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRotation((prev) => (prev + 90) % 360);
                  setPosition({ x: 0, y: 0 });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted text-foreground text-xs font-semibold cursor-pointer transition-all active:scale-95"
              >
                <RotateCw className="h-3.5 w-3.5 text-teal-500" />
                Putar 90°
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale(fillZoom);
                  setPosition({ x: 0, y: 0 });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted text-foreground text-xs font-semibold cursor-pointer transition-all active:scale-95"
              >
                <Maximize2 className="h-3.5 w-3.5 text-teal-500" />
                Isi penuh
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setScale(1);
                setRotation(0);
                setPosition({ x: 0, y: 0 });
              }}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-10 rounded-2xl text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleCrop}
            className="flex-1 h-10 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            <Check className="mr-1.5 h-4 w-4" />
            Terapkan & Potong
          </Button>
        </div>
      </div>
    </div>
  );
}
