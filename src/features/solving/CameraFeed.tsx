import { useEffect, useRef } from "react";
import { useCamera } from "../../hooks/useCamera";

interface CameraFeedProps {
  onEmbeddingCapture: (embedding: number[]) => void;
  isActive: boolean;
  scanning: boolean;
}

export default function CameraFeed({
  onEmbeddingCapture,
  isActive,
  scanning,
}: CameraFeedProps) {
  const {
    videoRef,
    isReady,
    error,
    startCamera,
    stopCamera,
    captureEmbedding,
  } = useCamera();
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isActive) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isActive]);

  useEffect(() => {
    if (!isReady || !scanning) return;

    const interval = setInterval(() => {
      if (videoRef.current && debugCanvasRef.current) {
        const video = videoRef.current;
        const canvas = debugCanvasRef.current;
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext("2d")!;
        const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.5;
        const startX = (video.videoWidth - cropSize) / 2;
        const startY = (video.videoHeight - cropSize) / 2;
        ctx.drawImage(
          video,
          startX,
          startY,
          cropSize,
          cropSize,
          0,
          0,
          224,
          224,
        );
      }

      const embedding = captureEmbedding();
      if (embedding) onEmbeddingCapture(embedding);
    }, 1500);

    return () => clearInterval(interval);
  }, [isReady, scanning, captureEmbedding]);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative w-full rounded-[20px] overflow-hidden bg-sky-100/40 border border-sky-200/60"
        style={{ aspectRatio: "4/3" }}
      >
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="font-body text-sky-500 text-xs text-center">
              {error}
            </p>
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
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-1/2 rounded-none border-2 border-sky-400"
                style={{
                  aspectRatio: "1/1",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                }}
              />
            </div>
            {scanning && isReady && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-sky-400/80 rounded-full px-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <p className="font-body text-white text-xs">scanning</p>
              </div>
            )}
            {!scanning && isReady && (
              <div className="absolute top-3 right-3 bg-green-400/80 rounded-full px-2 py-1">
                <p className="font-body text-white text-xs">paused</p>
              </div>
            )}
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-sky-50/60">
                <p className="font-body text-sky-400 text-xs">
                  Starting camera...
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {isReady && (
        <div className="flex items-center gap-3 bg-sky-50/60 border border-sky-200/60 rounded-[12px] p-2">
          <canvas
            ref={debugCanvasRef}
            width={224}
            height={224}
            className="border border-sky-200"
            style={{
              width: 80,
              height: 80,
              imageRendering: "pixelated",
              borderRadius: 0,
            }}
          />
          <div className="flex flex-col gap-1">
            <p className="font-body font-semibold text-sky-600 text-xs">
              What AI sees
            </p>
            <p className="font-body text-sky-400 text-xs">
              224×224 center crop
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
