interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'outline'
  className?: string
  disabled?: boolean
}

export default function Button({
  label,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
}: ButtonProps) {
  const base = `
    rounded-full px-8 py-3 font-body font-semibold
    transition-all duration-150 cursor-pointer
    disabled:opacity-50 disabled:cursor-not-allowed
  `

  const styles = {
    primary: `
      bg-sky-400 text-white
      hover:bg-sky-500 hover:scale-[1.03]
      active:scale-[0.98]
    `,
    outline: `
      bg-transparent text-sky-600
      border-2 border-sky-300
      hover:bg-sky-100 hover:scale-[1.03]
      active:scale-[0.98]
    `,
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {label}
    </button>
  )
}