import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PixelText from "../components/ui/PixelText";
import PillSelector from "../components/ui/PillSelector";
import UploadZone from "../features/upload/UploadZone";
import { usePuzzleStore } from "../store/puzzleStore";
import type { PieceCount } from "../types/puzzle";
import { getGridConfig } from "../utils/gridConfig";

const PIECE_OPTIONS: PieceCount[] = [25, 100, 250, 500, 1000];

export default function SetupPage() {
  const navigate = useNavigate();
  const {
    setImage,
    setPieceCount,
    setGrid,
    setStatus,
    originalImage,
    pieceCount,
  } = usePuzzleStore();
  const [localImage, setLocalImage] = useState<string | null>(originalImage);
  const [localCount, setLocalCount] = useState<PieceCount | null>(pieceCount);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [puzzleWidth, setPuzzleWidth] = useState<number>(12);
  const [puzzleHeight, setPuzzleHeight] = useState<number>(9);
  const [unit, setUnit] = useState<"in" | "cm">("in");

  const handleImageUpload = (url: string) => {
    setLocalImage(url);
    const img = new Image();
    img.onload = () => setImgSize({ w: img.width, h: img.height });
    img.src = url;
  };

  const handleUnitToggle = (newUnit: "in" | "cm") => {
    if (newUnit === unit) return;
    if (newUnit === "cm") {
      setPuzzleWidth(Math.round(puzzleWidth * 2.54));
      setPuzzleHeight(Math.round(puzzleHeight * 2.54));
    } else {
      setPuzzleWidth(Math.round((puzzleWidth / 2.54) * 10) / 10);
      setPuzzleHeight(Math.round((puzzleHeight / 2.54) * 10) / 10);
    }
    setUnit(newUnit);
  };

  const getGridPreview = () => {
    if (!localCount) return null;
    const grid = getGridConfig(localCount, puzzleWidth, puzzleHeight);
    const pieceW = (puzzleWidth / grid.cols).toFixed(1);
    const pieceH = (puzzleHeight / grid.rows).toFixed(1);
    return { grid, pieceW, pieceH };
  };

  const preview = getGridPreview();
  const canProceed =
    localImage && localCount && puzzleWidth > 0 && puzzleHeight > 0;

  const handleStart = () => {
    if (!localImage || !localCount) return;
    const grid = getGridConfig(localCount, puzzleWidth, puzzleHeight);
    setImage(localImage);
    setPieceCount(localCount);
    setGrid(grid);
    setStatus("processing");
    navigate("/processing");
  };

  return (
    <AppShell>
      <div className="flex flex-col items-center gap-6 w-full max-w-lg">
        <div className="flex items-center gap-3 self-start">
          <button
            onClick={() => navigate("/")}
            className="text-sky-400 font-body text-sm hover:text-sky-600 transition-colors"
          >
            ← Back
          </button>
        </div>

        <PixelText text="SETUP" size="md" />

        <Card className="w-full flex flex-col gap-5">
          {/* Step 1 — image */}
          <div>
            <p className="font-body font-semibold text-sky-700 text-sm mb-3">
              1. Upload your puzzle image
            </p>
            <UploadZone
              onImageUpload={handleImageUpload}
              uploadedImage={localImage}
            />
            {localImage && (
              <button
                onClick={() => {
                  setLocalImage(null);
                  setImgSize(null);
                }}
                className="mt-2 text-xs text-sky-400 hover:text-sky-600 font-body transition-colors"
              >
                × Remove image
              </button>
            )}
          </div>

          {/* Step 2 — dimensions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-body font-semibold text-sky-700 text-sm">
                2. Puzzle dimensions?
              </p>
              {/* Unit toggle */}
              <div className="flex gap-1 bg-sky-100/60 rounded-full p-0.5">
                <button
                  onClick={() => handleUnitToggle("in")}
                  className={`px-3 py-1 rounded-full font-body text-xs font-semibold transition-all
                    ${unit === "in" ? "bg-sky-400 text-white" : "text-sky-500 hover:text-sky-700"}`}
                >
                  in
                </button>
                <button
                  onClick={() => handleUnitToggle("cm")}
                  className={`px-3 py-1 rounded-full font-body text-xs font-semibold transition-all
                    ${unit === "cm" ? "bg-sky-400 text-white" : "text-sky-500 hover:text-sky-700"}`}
                >
                  cm
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="font-body text-sky-500 text-xs">
                  Width ({unit})
                </label>
                <input
                  type="number"
                  value={puzzleWidth}
                  onChange={(e) => setPuzzleWidth(Number(e.target.value))}
                  className="border border-sky-200 rounded-[12px] px-3 py-2
                    font-body text-sky-700 text-sm bg-white/60
                    focus:outline-none focus:border-sky-400"
                  min={1}
                  step={unit === "in" ? 0.5 : 1}
                />
              </div>
              <span className="font-body text-sky-400 text-lg mt-4">×</span>
              <div className="flex flex-col gap-1 flex-1">
                <label className="font-body text-sky-500 text-xs">
                  Height ({unit})
                </label>
                <input
                  type="number"
                  value={puzzleHeight}
                  onChange={(e) => setPuzzleHeight(Number(e.target.value))}
                  className="border border-sky-200 rounded-[12px] px-3 py-2
                    font-body text-sky-700 text-sm bg-white/60
                    focus:outline-none focus:border-sky-400"
                  min={1}
                  step={unit === "in" ? 0.5 : 1}
                />
              </div>
            </div>
            <p className="font-body text-sky-400 text-xs mt-2">
              Check the back of your puzzle box
            </p>
          </div>

          {/* Step 3 — piece count */}
          <div>
            <p className="font-body font-semibold text-sky-700 text-sm mb-3">
              3. How many pieces?
            </p>
            <PillSelector
              options={PIECE_OPTIONS}
              selected={localCount}
              onSelect={setLocalCount}
            />
          </div>

          {/* Grid preview */}
          {preview && (
            <div className="bg-sky-50/60 border border-sky-200/60 rounded-[16px] p-4 text-center">
              <p className="font-body text-sky-600 text-xs">
                📐 {preview.grid.cols} × {preview.grid.rows} grid &nbsp;·&nbsp;
                ~{preview.pieceW} × {preview.pieceH}
                {unit} per piece &nbsp;·&nbsp;
                {preview.grid.cols * preview.grid.rows} total pieces
              </p>
            </div>
          )}

          <Button
            label="Analyse Puzzle →"
            onClick={handleStart}
            disabled={!canProceed}
            className="w-full"
          />
        </Card>
      </div>
    </AppShell>
  );
}
