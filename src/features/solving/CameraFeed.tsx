import { useEffect, useRef } from "react";
import { useCamera } from "../../hooks/useCamera";
import { type HistogramConfig } from "../../utils/colorHistogram";

interface CameraFeedProps {
  onEmbeddingCapture: (embedding: number[]) => void;
  isActive: boolean;
  scanning: boolean;
  cfg: HistogramConfig;
}

export default function CameraFeed({
  onEmbeddingCapture,
  isActive,
  scanning,
  cfg,
}: CameraFeedProps) {
  const {
    videoRef,
    isReady,
    error,
    startCamera,
    stopCamera,
    captureEmbedding,
  } = useCamera(cfg);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isActive) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isActive]);

  useEffect(() => {
    if (!isReady || !scanning) return;

    // Update debug canvas preview
    if (videoRef.current && debugCanvasRef.current) {
      const video = videoRef.current;
      const canvas = debugCanvasRef.current;
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext("2d")!;
      const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.6;
      const startX = (video.videoWidth - cropSize) / 2;
      const startY = (video.videoHeight - cropSize) / 2;
      ctx.drawImage(video, startX, startY, cropSize, cropSize, 0, 0, 224, 224);
    }

    captureEmbedding().then((embedding) => {
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

            {/* Scan guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`rounded-none border-2 transition-colors duration-200 ${scanning ? "border-yellow-300" : "border-sky-400"}`}
                style={{
                  width: "60%",
                  aspectRatio: "1/1",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                }}
              />
            </div>

            {/* Corner tick marks to guide filling the box */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[
                "top-[20%] left-[20%]  border-t-2 border-l-2",
                "top-[20%] right-[20%] border-t-2 border-r-2",
                "bottom-[20%] left-[20%]  border-b-2 border-l-2",
                "bottom-[20%] right-[20%] border-b-2 border-r-2",
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-4 h-4 border-white/70 ${cls}`}
                />
              ))}
            </div>

            {/* Instruction text inside the dim area */}
            <div className="absolute bottom-[22%] w-full flex justify-center pointer-events-none">
              <p className="font-body text-white/80 text-[10px] bg-black/30 px-2 py-0.5 rounded-full">
                Fill the box · place on white paper
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
            <p className="font-body text-sky-400 text-xs">Piece should fill the box</p>
            <p className="font-body text-sky-300 text-[10px]">White paper background works best</p>
          </div>
        </div>
      )}
    </div>
  );
}
