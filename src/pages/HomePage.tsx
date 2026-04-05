import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PixelText from '../components/ui/PixelText'
import ProgressBar from '../components/ui/ProgressBar'
import PillSelector from '../components/ui/PillSelector'
import { useState } from 'react'
import type { PieceCount } from '../types/puzzle'

export default function HomePage() {
  const [selected, setSelected] = useState<PieceCount | null>(null)

  return (
    <AppShell>
      <Card className="w-full max-w-md flex flex-col gap-6 items-center">
        <PixelText text="PUZZLE" size="lg" />
        <ProgressBar value={60} />
        <PillSelector
          options={[25, 100, 250, 500, 1000]}
          selected={selected}
          onSelect={setSelected}
        />
        <Button label="Start Solving" onClick={() => {}} />
      </Card>
    </AppShell>
  )
}