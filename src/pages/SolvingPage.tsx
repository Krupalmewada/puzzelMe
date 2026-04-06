import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import ProgressBar from "../components/ui/ProgressBar";
import PixelText from "../components/ui/PixelText";
import CameraFeed from "../features/solving/CameraFeed";
import SuggestionCard from "../features/solving/SuggestionCard";
import PuzzleGrid from "../features/solving/PuzzleGrid";
import { usePuzzleStore } from "../store/puzzleStore";
import { useMatcher, type MatchResult } from "../hooks/useMatcher";
import { getPixelVector } from "../utils/colorHistogram";

export default function SolvingPage() {
  const navigate = useNavigate();
  const { pieces, placedPieceIds, markPlaced, setStatus, setEndTime, grid } =
    usePuzzleStore();
  const { findMatches } = useMatcher(pieces);

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [scanMode, setScanMode] = useState<"camera" | "upload">("camera");
  const [uploadedPiece, setUploadedPiece] = useState<string | null>(null);
  const pieceInputRef = useRef<HTMLInputElement>(null);

  const placed = placedPieceIds.size;
  const total = pieces.length;
  const progress = total > 0 ? Math.round((placed / total) * 100) : 0;

  const handleEmbedding = useCallback(
    (embedding: number[]) => {
      setIsScanning(true);
      const results = findMatches(embedding, 5);
      setMatches(results);
      if (results[0]) setHighlightId(results[0].piece.id);
      setScanning(false);
      setIsScanning(false);
    },
    [findMatches],
  );

  const handleConfirm = (id: string) => {
    markPlaced(id);
    setMatches([]);
    setHighlightId(null);
    setScanning(false);
    setUploadedPiece(null);

    if (placedPieceIds.size + 1 >= total) {
      setEndTime(Date.now());
      setStatus("complete");
      navigate("/complete");
    }
  };

  const handleScanPress = () => {
    setMatches([]);
    setHighlightId(null);
    setScanning(true);
  };

  const handlePieceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setUploadedPiece(ev.target.result as string);
        setMatches([]);
        setHighlightId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePieceScan = useCallback(async () => {
    if (!uploadedPiece) return;
    setScanning(true);
    setMatches([]);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const embedding = getPixelVector(canvas);
      const results = findMatches(embedding, 25) // get more candidates
        .filter((r) => r.score > 0) // only positive matches
        .slice(0, 5); // top 5
      setMatches(results);
      if (results[0]) setHighlightId(results[0].piece.id);
      setScanning(false);
    };
    img.src = uploadedPiece;
  }, [uploadedPiece, findMatches]);

  return (
    <div
      className="min-h-screen w-full px-4 py-6"
      style={{
        background:
          "linear-gradient(135deg, #DBEAFE 0%, #EFF8FF 50%, #BAE6FD 100%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 max-w-5xl mx-auto">
        <PixelText text="SOLVING" size="sm" />
        <div className="flex items-center gap-3">
          <span className="font-body text-sky-500 text-xs">
            {placed}/{total} placed
          </span>
          <button
            onClick={() => {
              if (confirm("Quit this puzzle?")) navigate("/");
            }}
            className="font-body text-sky-400 text-xs hover:text-sky-600"
          >
            Quit
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-5xl mx-auto mb-4">
        <ProgressBar value={progress} />
      </div>

      {/* Main layout */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left — puzzle grid */}
        <Card className="flex flex-col gap-3 items-center">
          <p className="font-body font-semibold text-sky-700 text-xs uppercase tracking-wide self-start">
            Puzzle Board
          </p>
          <PuzzleGrid
            pieces={pieces}
            placedIds={placedPieceIds}
            highlightId={highlightId}
            onTogglePlaced={handleConfirm}
          />
          <p className="font-body text-sky-400 text-xs text-center">
            Tap a cell to mark it placed
          </p>
        </Card>

        {/* Right — scan + suggestion */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            {/* Mode toggle */}
            <div className="flex gap-1 bg-sky-100/60 rounded-full p-1">
              <button
                onClick={() => {
                  setScanMode("camera");
                  setMatches([]);
                  setUploadedPiece(null);
                }}
                className={`flex-1 py-1.5 rounded-full font-body text-xs font-semibold transition-all
                  ${scanMode === "camera" ? "bg-sky-400 text-white" : "text-sky-500 hover:text-sky-700"}`}
              >
                📷 Camera
              </button>
              <button
                onClick={() => {
                  setScanMode("upload");
                  setMatches([]);
                  setScanning(false);
                }}
                className={`flex-1 py-1.5 rounded-full font-body text-xs font-semibold transition-all
                  ${scanMode === "upload" ? "bg-sky-400 text-white" : "text-sky-500 hover:text-sky-700"}`}
              >
                🖼️ Upload
              </button>
            </div>

            {/* Camera mode */}
            {scanMode === "camera" && (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-body font-semibold text-sky-700 text-xs uppercase tracking-wide">
                    Camera
                  </p>
                  <button
                    onClick={() => setCameraActive((v) => !v)}
                    className="font-body text-sky-400 text-xs hover:text-sky-600"
                  >
                    {cameraActive ? "Pause" : "Resume"}
                  </button>
                </div>
                <CameraFeed
                  onEmbeddingCapture={handleEmbedding}
                  isActive={cameraActive}
                  scanning={scanning}
                />
                <Button
                  label={scanning ? "Scanning..." : "🔍 Scan This Piece"}
                  onClick={handleScanPress}
                  disabled={scanning || !cameraActive}
                  className="w-full"
                />
                <p className="font-body text-sky-400 text-xs text-center">
                  Place piece on white paper · press scan
                </p>
              </>
            )}

            {/* Upload mode */}
            {scanMode === "upload" && (
              <>
                <p className="font-body font-semibold text-sky-700 text-xs uppercase tracking-wide">
                  Upload piece image
                </p>
                <div
                  onClick={() => pieceInputRef.current?.click()}
                  className="w-full rounded-[16px] border-2 border-dashed cursor-pointer
                    border-sky-300/70 bg-sky-50/40 hover:bg-sky-100/40
                    hover:border-sky-400 transition-all flex items-center
                    justify-center overflow-hidden"
                  style={{ aspectRatio: "4/3" }}
                >
                  <input
                    ref={pieceInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePieceUpload}
                  />
                  {uploadedPiece ? (
                    <img
                      src={uploadedPiece}
                      className="w-full h-full object-contain bg-white"
                      alt="uploaded piece"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <p className="text-3xl">🧩</p>
                      <p className="font-body text-sky-500 text-sm font-semibold">
                        Upload piece photo
                      </p>
                      <p className="font-body text-sky-400 text-xs">
                        tap to browse · or screenshot a piece
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  label={scanning ? "Matching..." : "🔍 Match This Piece"}
                  onClick={handlePieceScan}
                  disabled={scanning || !uploadedPiece}
                  className="w-full"
                />

                {uploadedPiece && (
                  <button
                    onClick={() => {
                      setUploadedPiece(null);
                      setMatches([]);
                    }}
                    className="font-body text-sky-400 text-xs text-center hover:text-sky-600"
                  >
                    × Clear image
                  </button>
                )}
              </>
            )}
          </Card>

          {grid && (
            <SuggestionCard
              matches={matches}
              isScanning={isScanning}
              onConfirm={handleConfirm}
              grid={grid}
            />
          )}
        </div>
      </div>
    </div>
  );
}
