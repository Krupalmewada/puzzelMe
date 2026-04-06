import Card from "../../components/ui/Card";
import { getEdgeInfo } from "../../utils/detectEdges";
import type { GridConfig } from "../../types/puzzle";
import type { MatchResult } from "../../hooks/useMatcher";

interface SuggestionCardProps {
  matches: MatchResult[];
  isScanning: boolean;
  onConfirm: (id: string) => void;
  grid: GridConfig;
}

export default function SuggestionCard({
  matches,
  isScanning,
  onConfirm,
  grid,
}: SuggestionCardProps) {
  return (
    <Card className="w-full flex flex-col gap-3">
      <p className="font-body font-semibold text-sky-700 text-xs uppercase tracking-wide">
        Top Matches — pick the right one
      </p>

      {isScanning && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <p className="font-body text-sky-400 text-xs">Scanning piece...</p>
        </div>
      )}

      {!isScanning && matches.length === 0 && (
        <p className="font-body text-sky-400 text-xs">
          Hold a piece on white paper inside the box
        </p>
      )}

      {!isScanning && matches.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-body text-sky-400 text-xs mb-1">
            Which of these looks like your piece?
          </p>

          {matches.map((m, i) => {
            const edgeInfo = getEdgeInfo(m.piece, grid);

            const edgeLabel = edgeInfo.isCorner
              ? "📐 Corner piece"
              : edgeInfo.isBorder
                ? "📏 Border piece"
                : "🔲 Inner piece";

            const edgeDetail = [
              edgeInfo.edges.top && "straight top",
              edgeInfo.edges.bottom && "straight bottom",
              edgeInfo.edges.left && "straight left",
              edgeInfo.edges.right && "straight right",
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <button
                key={m.piece.id}
                onClick={() => onConfirm(m.piece.id)}
                className="flex items-center gap-3 p-2 rounded-[12px] border border-sky-200
                  hover:bg-sky-100/60 hover:border-sky-400 transition-all text-left"
              >
                <img
                  src={m.piece.imageDataUrl}
                  className="w-14 h-14 border border-sky-200 object-cover flex-shrink-0"
                  style={{ borderRadius: 0 }}
                  alt={`match ${i + 1}`}
                />

                <div className="flex flex-col gap-1">
                  <p className="font-body font-semibold text-sky-700 text-sm">
                    Row {m.piece.row + 1}, Col {m.piece.col + 1}
                  </p>

                  <span
                    className={`
                    font-body text-xs px-2 py-0.5 rounded-full w-fit
                    ${edgeInfo.isCorner ? "bg-amber-100 text-amber-600" : ""}
                    ${edgeInfo.isBorder ? "bg-sky-100 text-sky-600" : ""}
                    ${edgeInfo.isInner ? "bg-gray-100 text-gray-500" : ""}
                  `}
                  >
                    {edgeLabel}
                  </span>

                  {edgeDetail && (
                    <p className="font-body text-sky-400 text-xs">
                      {edgeDetail}
                    </p>
                  )}

                  <p className="font-body text-sky-300 text-xs">
                    {Math.round(m.score * 100)}% color match
                  </p>
                </div>

                <div className="ml-auto text-sky-300 text-lg">→</div>
              </button>
            );
          })}

          <p className="font-body text-sky-300 text-xs text-center mt-1">
            Tap the one that matches your piece
          </p>
        </div>
      )}
    </Card>
  );
}
