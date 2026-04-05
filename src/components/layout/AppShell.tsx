import { ReactNode } from "react"

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: 'linear-gradient(135deg, #DBEAFE 0%, #EFF8FF 50%, #BAE6FD 100%)',
      }}
    >
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {children}
      </div>
    </div>
  )
}