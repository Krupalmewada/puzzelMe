import { useEffect, useRef } from "react";
import { useCamera } from "../../hooks/useCamera";
import { type HistogramConfig } from "../../utils/colorHistogram";
import { detectPieceRegion, type PieceRegion } from "../../utils/detectPiece";

interface CameraFeedProps {
  onEmbeddingCapture: (embedding: number[]) => void;
  isActive: boolean;
  scanning: boolean;
  cfg: HistogramConfig;
}

/** Convert a video-pixel region to overlay-canvas pixel coordinates. */
function videoToCanvas(
  region: PieceRegion,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): { cx: number; cy: number; cw: number; ch: number } {
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  // object-cover: scale so the video fills the element (may overflow one axis)
  const scale = Math.max(cssW / vw, cssH / vh);
  const offsetX = (cssW - vw * scale) / 2;
  const offsetY = (cssH - vh * scale) / 2;
  return {
    cx: region.x * scale + offsetX,
    cy: region.y * scale + offsetY,
    cw: region.w * scale,
    ch: region.h * scale,
  };
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  region: PieceRegion | null,
) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  if (!w || !h) return;

  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);

  if (region) {
    const { cx, cy, cw, ch } = videoToCanvas(region, video, canvas);
    const confident = region.confidence > 0.45;
    const color = confident ? "#4ade80" : "#fbbf24"; // green or yellow

    // Dim everything outside the detected region
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, w, h);
    ctx.clearRect(cx, cy, cw, ch);

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);

    // Corner tick marks
    const cs = Math.min(16, cw * 0.12, ch * 0.12);
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    for (const [ax, ay, dx, dy] of [
      [cx,      cy,      1,  1],
      [cx + cw, cy,     -1,  1],
      [cx,      cy + ch, 1, -1],
      [cx + cw, cy + ch,-1, -1],
    ] as [number, number, number, number][]) {
      ctx.beginPath();
      ctx.moveTo(ax + dx * cs, ay);
      ctx.lineTo(ax, ay);
      ctx.lineTo(ax, ay + dy * cs);
      ctx.stroke();
    }
  } else {
    // No piece found — show a dashed guide box
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(0, 0, w, h);
    const bx = w * 0.2, by = h * 0.2, bw = w * 0.6, bh = h * 0.6;
    ctx.clearRect(bx, by, bw, bh);
    ctx.strokeStyle = "rgba(147,197,253,0.75)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.setLineDash([]);
  }
}

export default function CameraFeed({
  onEmbeddingCapture,
  isActive,
  scanning,
  cfg,
}: CameraFeedProps) {
  const { videoRef, isReady, error, startCamera, stopCamera, captureEmbedding } =
    useCamera(cfg);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectedRegionRef = useRef<PieceRegion | null>(null);

  useEffect(() => {
    if (isActive) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isActive]);

  // Continuous detection loop — runs while camera is ready
  useEffect(() => {
    if (!isReady) return;
    const id = setInterval(() => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      if (!video || !canvas) return;
      const region = detectPieceRegion(video);
      detectedRegionRef.current = region;
      drawOverlay(canvas, video, region);
    }, 180);
    return () => clearInterval(id);
  }, [isReady]);

  // Capture when scanning prop fires
  useEffect(() => {
    if (!isReady || !scanning) return;

    // Update debug canvas preview with what will actually be captured
    const video = videoRef.current;
    const debug = debugCanvasRef.current;
    const region = detectedRegionRef.current;
    if (video && debug) {
      debug.width = 224;
      debug.height = 224;
      const ctx = debug.getContext("2d")!;
      if (region && region.w > 20 && region.h > 20) {
        ctx.drawImage(video, region.x, region.y, region.w, region.h, 0, 0, 224, 224);
      } else {
        const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.6;
        const sx = (video.videoWidth - cropSize) / 2;
        const sy = (video.videoHeight - cropSize) / 2;
        ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 224, 224);
      }
    }

    captureEmbedding(region).then((embedding) => {
      if (embedding) onEmbeddingCapture(embedding);
    });
  }, [isReady, scanning]);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative w-full rounded-[20px] overflow-hidden bg-sky-100/40 border border-sky-200/60"
        style={{ aspectRatio: "4/3" }}
      >
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="font-body text-sky-500 text-xs text-center">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />

            {/* Detection overlay canvas — replaces the old static box */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: "none" }}
            />

            {/* Instruction */}
            <div className="absolute bottom-3 w-full flex justify-center pointer-events-none">
              <p className="font-body text-white/80 text-[10px] bg-black/30 px-2 py-0.5 rounded-full">
                Point at piece on white paper
              </p>
            </div>

            {scanning && isReady && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-yellow-400/90 rounded-full px-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <p className="font-body text-white text-xs font-semibold">scanning</p>
              </div>
            )}
            {!scanning && isReady && (
              <div className="absolute top-3 right-3 bg-green-400/80 rounded-full px-2 py-1">
                <p className="font-body text-white text-xs">ready</p>
              </div>
            )}
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-sky-50/60">
                <p className="font-body text-sky-400 text-xs">Starting camera...</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* What AI sees */}
      {isReady && (
        <div className="flex items-center gap-3 bg-sky-50/60 border border-sky-200/60 rounded-[12px] p-2">
          <canvas
            ref={debugCanvasRef}
            width={224}
            height={224}
            className="border border-sky-200 flex-shrink-0"
            style={{ width: 72, height: 72, imageRendering: "pixelated", borderRadius: 0 }}
          />
          <div className="flex flex-col gap-0.5">
            <p className="font-body font-semibold text-sky-600 text-xs">What AI sees</p>
            <p className="font-body text-sky-400 text-xs">Green box = piece detected</p>
            <p className="font-body text-sky-300 text-[10px]">White paper background works best</p>
          </div>
        </div>
      )}
    </div>
  );
}
