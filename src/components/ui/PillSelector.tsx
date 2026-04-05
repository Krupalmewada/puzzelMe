import type { PieceCount } from '../../types/puzzle'

interface PillSelectorProps {
  options: PieceCount[]
  selected: PieceCount | null
  onSelect: (count: PieceCount) => void
}

export default function PillSelector({
  options,
  selected,
  onSelect,
}: PillSelectorProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {options.map((option) => {
        const isSelected = selected === option
        return (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`
              px-6 py-2 rounded-full font-body font-semibold text-sm
              border-2 transition-all duration-150
              hover:scale-[1.05] active:scale-[0.97]
              ${isSelected
                ? 'bg-sky-400 border-sky-400 text-white'
                : 'bg-transparent border-sky-300 text-sky-600 hover:bg-sky-100'
              }
            `}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}