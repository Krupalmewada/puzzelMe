interface ProgressBarProps {
  value: number    // 0 to 100
  className?: string
}

export default function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      className={`
        w-full h-3 rounded-full
        bg-sky-100/60 border border-sky-200/50
        overflow-hidden ${className}
      `}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-500 transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}