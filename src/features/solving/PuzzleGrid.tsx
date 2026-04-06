import type { PuzzlePiece } from "../../types/puzzle";

interface PuzzleGridProps {
  pieces: PuzzlePiece[];
  placedIds: Set<string>;
  highlightId: string | null;
  onTogglePlaced: (id: string) => void;
}

export default function PuzzleGrid({
  pieces,
  placedIds,
  highlightId,
  onTogglePlaced,
}: PuzzleGridProps) {
  if (pieces.length === 0) return null;

  const maxCol = Math.max(...pieces.map((p) => p.col)) + 1;
  const maxRow = Math.max(...pieces.map((p) => p.row)) + 1;
  const cellSize = Math.min(Math.floor(280 / maxCol), Math.floor(200 / maxRow));

  return (
    <div
      className="border border-sky-200/60 overflow-hidden bg-sky-50/40"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${maxCol}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${maxRow}, ${cellSize}px)`,
        width: maxCol * cellSize,
        height: maxRow * cellSize,
      }}
    >
      {pieces.map((piece) => {
        const isPlaced = placedIds.has(piece.id);
        const isHighlighted = highlightId === piece.id;

        return (
          <div
            key={piece.id}
            onClick={() => onTogglePlaced(piece.id)}
            title={`Row ${piece.row + 1}, Col ${piece.col + 1}`}
            style={{ width: cellSize, height: cellSize }}
            className={`
  border border-sky-200/40 cursor-pointer transition-all duration-200 rounded-none
  ${isHighlighted ? "bg-sky-400/60 border-sky-500" : ""}
  ${isPlaced && !isHighlighted ? "bg-green-200/60 border-green-300" : ""}
  ${!isPlaced && !isHighlighted ? "bg-sky-100/30 hover:bg-sky-200/40" : ""}
`}
          />
        );
      })}
    </div>
  );
}
