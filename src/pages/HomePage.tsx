import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PixelText from '../components/ui/PixelText'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <AppShell>
      <div className="flex flex-col items-center gap-8 w-full max-w-lg">

        {/* Logo / Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-[24px] bg-sky-400/20 border-2 border-sky-300/60 flex items-center justify-center text-4xl">
            🧩
          </div>
          <PixelText text="PUZZEL ME" size="lg" className="text-center leading-relaxed" />
        </div>

        {/* Main card */}
        <Card className="w-full flex flex-col items-center gap-6 text-center">

          <div className="flex flex-col gap-2">
            <p className="text-sky-700 font-body font-semibold text-lg">
              Solve smarter, not harder
            </p>
            <p className="text-sky-500 font-body text-sm leading-relaxed">
              Upload your puzzle image, hold a piece up to the camera,
              and we'll tell you exactly where it goes.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {['AI Powered', 'Live Camera', 'Instant Match', '100% Free'].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full text-xs font-body font-semibold bg-sky-100 text-sky-600 border border-sky-200"
              >
                {f}
              </span>
            ))}
          </div>

          <Button
            label="Start Solving →"
            onClick={() => navigate('/setup')}
            className="w-full max-w-xs"
          />

        </Card>

        {/* Footer note */}
        <p className="text-sky-400 font-body text-xs text-center">
          No account needed · Works in your browser
        </p>

      </div>
    </AppShell>
  )
}