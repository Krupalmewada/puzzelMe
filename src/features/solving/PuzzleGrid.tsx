import { useState, useRef } from "react";
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
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  if (pieces.length === 0) return null;

  const maxCol = Math.max(...pieces.map((p) => p.col)) + 1;
  const maxRow = Math.max(...pieces.map((p) => p.row)) + 1;

  const containerWidth = 280;
  const baseCellSize = Math.min(
    Math.floor(containerWidth / maxCol),
    Math.floor(200 / maxRow),
    20,
  );
  const cellSize = Math.max(baseCellSize, 4);

  const gridWidth = maxCol * cellSize;
  const gridHeight = maxRow * cellSize;

  const ZOOM_LEVELS = [1, 1.5, 2, 3, 4];

  const handleZoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[idx + 1]);
    }
  };

  const handleZoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) {
      setZoom(ZOOM_LEVELS[idx - 1]);
      if (idx - 1 === 0) setOffset({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom === 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: offsetStart.current.x + dx,
      y: offsetStart.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // touch support
  const touchStart = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom === 1) return;
    const t = e.touches[0];
    isDragging.current = true;
    touchStart.current = { x: t.clientX, y: t.clientY };
    offsetStart.current = { ...offset };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    setOffset({
      x: offsetStart.current.x + dx,
      y: offsetStart.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  // highlight cell scroll into view
  const highlightPiece = pieces.find((p) => p.id === highlightId);

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Zoom controls */}
      <div className="flex items-center justify-between">
        <p className="font-body text-sky-500 text-xs">
          {maxCol} × {maxRow} grid
        </p>
        <div className="flex items-center gap-2">
          {highlightPiece && (
            <span className="font-body text-sky-500 text-xs bg-sky-100 px-2 py-0.5 rounded-full">
              → R{highlightPiece.row + 1} C{highlightPiece.col + 1}
            </span>
          )}
          <div className="flex items-center gap-1 bg-sky-100/60 rounded-full px-2 py-1">
            <button
              onClick={handleZoomOut}
              disabled={zoom === ZOOM_LEVELS[0]}
              className="w-5 h-5 flex items-center justify-center font-body
                text-sky-600 hover:text-sky-800 disabled:text-sky-300
                transition-colors text-sm font-bold"
            >
              −
            </button>
            <span className="font-body text-sky-600 text-xs min-w-[28px] text-center">
              {zoom}×
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              className="w-5 h-5 flex items-center justify-center font-body
                text-sky-600 hover:text-sky-800 disabled:text-sky-300
                transition-colors text-sm font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Grid container */}
      <div
        ref={containerRef}
        className="overflow-hidden rounded-[8px] border border-sky-200/60 bg-sky-50/40 cursor-grab active:cursor-grabbing"
        style={{ width: containerWidth, height: 200 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            width: gridWidth,
            height: gridHeight,
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
            transformOrigin: "top left",
            display: "grid",
            gridTemplateColumns: `repeat(${maxCol}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${maxRow}, ${cellSize}px)`,
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
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundImage: `url(${piece.imageDataUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                className={`
                  border-[0.5px] cursor-pointer transition-all duration-150 relative
                  ${
                    isHighlighted
                      ? "border-sky-500 z-10 ring-1 ring-sky-400 ring-offset-0"
                      : isPlaced
                        ? "border-green-400/60"
                        : "border-sky-200/40 hover:border-sky-400/60"
                  }
                `}
              >
                {/* colour overlay for state */}
                <div
                  className={`absolute inset-0 transition-opacity duration-150 ${
                    isHighlighted
                      ? "bg-sky-400/50"
                      : isPlaced
                        ? "bg-green-400/40"
                        : "bg-transparent hover:bg-sky-200/20"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-sky-400 rounded-sm" />
          <p className="font-body text-sky-500 text-xs">suggested</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-300/70 rounded-sm" />
          <p className="font-body text-sky-500 text-xs">placed</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-sky-100/60 border border-sky-200 rounded-sm" />
          <p className="font-body text-sky-500 text-xs">empty</p>
        </div>
      </div>

      {zoom > 1 && (
        <p className="font-body text-sky-400 text-xs text-center">
          drag to pan · tap cell to mark placed
        </p>
      )}
    </div>
  );
}
