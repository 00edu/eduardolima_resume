"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import type { AnnotationStroke, MediaItem } from "@/lib/types";
import { Eraser, Save } from "lucide-react";

const COLORS = ["#c45c26", "#2f5d50", "#1a211c", "#e11d48", "#2563eb"];

export function PhotoAnnotator({
  media,
  onSave,
}: {
  media: MediaItem;
  onSave: (next: MediaItem) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [strokes, setStrokes] = useState<AnnotationStroke[]>(media.annotation.strokes);
  const [notes, setNotes] = useState(media.annotation.notes);
  const [color, setColor] = useState(COLORS[0]);
  const drawing = useRef(false);
  const current = useRef<AnnotationStroke | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      redraw();
    };
    img.src = media.dataUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.dataUrl]);

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  function redraw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const maxW = canvas.parentElement?.clientWidth || 360;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
      }
      ctx.stroke();
    }
  }

  function pos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    drawing.current = true;
    current.current = { id: uuid(), color, points: [pos(e)] };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawing.current || !current.current) return;
    current.current.points.push(pos(e));
    setStrokes((prev) => {
      const without = prev.filter((s) => s.id !== current.current!.id);
      return [...without, { ...current.current! }];
    });
  }

  function onPointerUp() {
    drawing.current = false;
    current.current = null;
  }

  function handleSave() {
    onSave({
      ...media,
      annotation: { strokes, notes },
    });
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-ink/5">
        <canvas
          ref={canvasRef}
          className="touch-none w-full cursor-crosshair"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>
      <div className="flex items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className="h-8 w-8 rounded-full border-2 border-white shadow"
            style={{
              background: c,
              outline: color === c ? `2px solid ${c}` : undefined,
              outlineOffset: 2,
            }}
            aria-label={`Cor ${c}`}
          />
        ))}
        <button
          type="button"
          onClick={() => setStrokes([])}
          className="ml-auto inline-flex items-center gap-1 rounded-lg bg-white/80 px-3 py-2 text-xs font-semibold text-slate"
        >
          <Eraser size={14} /> Limpar
        </button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anotação desta foto…"
        rows={3}
        className="w-full rounded-xl border border-ink/10 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pine/30"
      />
      <button
        type="button"
        onClick={handleSave}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-pine py-3 text-sm font-bold text-white"
      >
        <Save size={16} /> Salvar marcações
      </button>
    </div>
  );
}
