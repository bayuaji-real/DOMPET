"use client";

import * as React from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Check, Move } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  // Crop & generate 256x256 image
  const handleCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const cropSize = 256;
    const canvas = document.createElement("canvas");
    canvas.width = cropSize;
    canvas.height = cropSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Viewport box is 260x260 in UI
    const viewportSize = 260;
    const ratio = cropSize / viewportSize;

    ctx.save();
    // Move to canvas center
    ctx.translate(cropSize / 2, cropSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate image render width & height preserving natural aspect ratio
    const imgWidth = img.naturalWidth || 300;
    const imgHeight = img.naturalHeight || 300;
    const minDim = Math.min(imgWidth, imgHeight);
    const baseScale = (viewportSize / minDim) * scale * ratio;

    const drawW = imgWidth * baseScale;
    const drawH = imgHeight * baseScale;

    // Adjust for offset position
    const offsetX = position.x * ratio;
    const offsetY = position.y * ratio;

    ctx.drawImage(img, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
    ctx.restore();

    // Export as optimized lightweight JPEG (~15KB - 25KB)
    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/20 dark:border-white/10 bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Sesuaikan & Potong Foto</h3>
            <p className="text-[11px] text-muted-foreground">Geser dan perbesar untuk mengatur foto profil</p>
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
              ref={imageRef}
              src={imageSrc}
              alt="Crop Source"
              draggable={false}
              className="absolute max-w-none transition-transform pointer-events-none"
              style={{
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                minWidth: "100%",
                minHeight: "100%",
                objectFit: "cover",
              }}
            />

            {/* Circular Mask Guide */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[210px] w-[210px] rounded-full border-2 border-dashed border-white/80 ring-[200px] ring-black/55 shadow-2xl" />
            </div>

            {/* Hint drag */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 backdrop-blur-xs text-white/80 text-[10px] font-semibold px-2 py-0.5 rounded-full">
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
              max="3"
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

          {/* Rotate & Reset */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted text-foreground text-xs font-semibold cursor-pointer transition-all active:scale-95"
            >
              <RotateCw className="h-3.5 w-3.5 text-teal-500" />
              Putar 90°
            </button>
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
