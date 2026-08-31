"use client";

import { useEffect, useRef, useState } from "react";
import type { HeatSpot } from "@/lib/types";

interface Props {
  src: string | null;
  label: string;
  heatSpots?: HeatSpot[];
  isWinner?: boolean;
  score?: number;
  onFile: (file: File | null) => void;
}

export function ThumbnailSlot({
  src,
  label,
  heatSpots = [],
  isWinner,
  score,
  onFile,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !src) return;

    const draw = () => {
      const w = img.clientWidth;
      const h = img.clientHeight;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      for (const spot of heatSpots) {
        const cx = spot.x * w;
        const cy = spot.y * h;
        const r = spot.radius * Math.min(w, h);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const alpha = 0.15 + spot.intensity * 0.55;
        g.addColorStop(0, `rgba(255, 64, 32, ${alpha})`);
        g.addColorStop(0.45, `rgba(255, 180, 40, ${alpha * 0.55})`);
        g.addColorStop(1, "rgba(255, 220, 80, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (img.complete) draw();
    else img.onload = draw;

    const ro = new ResizeObserver(draw);
    ro.observe(img);
    return () => ro.disconnect();
  }, [src, heatSpots]);

  function handleFiles(files: FileList | null) {
    const file = files?.[0] ?? null;
    if (file && !file.type.startsWith("image/")) return;
    onFile(file);
  }

  return (
    <div className={`slot ${isWinner ? "slot-winner" : ""}`}>
      <div className="slot-head">
        <span className="slot-label">{label}</span>
        {typeof score === "number" && (
          <span className="slot-score">{Math.round(score)} CTR</span>
        )}
        {isWinner && <span className="winner-badge">Winner</span>}
      </div>

      <button
        type="button"
        className={`dropzone ${dragging ? "dragging" : ""} ${src ? "has-image" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {src ? (
          <div className="preview-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={src} alt={`Thumbnail ${label}`} />
            <canvas ref={canvasRef} className="heat-canvas" aria-hidden />
            {heatSpots.length > 0 && (
              <ul className="heat-labels">
                {heatSpots.slice(0, 4).map((s, i) => (
                  <li key={`${s.label}-${i}`}>
                    <span
                      className="heat-dot"
                      style={{ opacity: 0.4 + s.intensity * 0.6 }}
                    />
                    {s.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="drop-hint">
            <span className="drop-plus">+</span>
            <span>Drop image or click to upload</span>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
