import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import PixelText from "../components/ui/PixelText";
import { usePuzzleStore } from "../store/puzzleStore";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function CompletePage() {
  const navigate = useNavigate();
  const { pieceCount, startTime, endTime, reset } = usePuzzleStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  const duration =
    startTime && endTime ? formatTime(endTime - startTime) : null;

  const handleNewPuzzle = () => {
    reset();
    navigate("/");
  };

  return (
    <AppShell>
      <div
        className={`flex flex-col items-center gap-8 w-full max-w-md transition-all duration-700
          ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        {/* Celebration */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-7xl animate-bounce">🎉</div>
          <PixelText text="COMPLETE!" size="lg" className="text-center" />
        </div>

        {/* Stats card */}
        <Card className="w-full flex flex-col gap-4 text-center">
          <p className="font-body font-semibold text-sky-700 text-lg">
            Puzzle Solved!
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-sky-50/60 rounded-[16px] p-4 flex flex-col gap-1">
              <p className="font-body text-sky-400 text-xs">Pieces</p>
              <PixelText text={String(pieceCount ?? 0)} size="md" />
            </div>
            <div className="bg-sky-50/60 rounded-[16px] p-4 flex flex-col gap-1">
              <p className="font-body text-sky-400 text-xs">Time</p>
              <p className="font-display text-sky-600 text-sm">
                {duration ?? "--"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              label="🧩 Start New Puzzle"
              onClick={handleNewPuzzle}
              className="w-full"
            />
            <button
              onClick={() => navigate("/solving")}
              className="font-body text-sky-400 text-sm hover:text-sky-600 transition-colors"
            >
              ← Back to puzzle
            </button>
          </div>
        </Card>

        <p className="font-body text-sky-400 text-xs text-center">
          No account needed · Works in your browser
        </p>
      </div>
    </AppShell>
  );
}
