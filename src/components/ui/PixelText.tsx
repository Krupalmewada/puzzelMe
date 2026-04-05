interface PixelTextProps {
  text: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function PixelText({
  text,
  size = 'md',
  className = '',
}: PixelTextProps) {
  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-2xl',
  }

  return (
    <span
      className={`font-display text-sky-600 ${sizes[size]} ${className}`}
    >
      {text}
    </span>
  )
}
