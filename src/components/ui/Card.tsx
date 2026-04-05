import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`
        backdrop-blur-md
        bg-sky-100/40
        border border-sky-300/60
        rounded-[24px]
        p-6
        ${className}
      `}
    >
      {children}
    </div>
  )
}