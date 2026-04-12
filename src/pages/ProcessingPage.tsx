import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import PixelText from '../components/ui/PixelText'
import ProgressBar from '../components/ui/ProgressBar'
import { usePuzzleStore } from '../store/puzzleStore'
import { sliceImage } from '../utils/sliceImage'

export default function ProcessingPage() {
  const navigate = useNavigate()
  const { originalImage, grid, pieceCount, setPieces, setStatus, setStartTime } = usePuzzleStore()
  const hasStarted = useRef(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('Slicing image...')

  useEffect(() => {
    if (!originalImage || !grid) {
      navigate('/')
      return
    }
    if (hasStarted.current) return
    hasStarted.current = true

    const run = async () => {
      setMessage('Slicing image into pieces...')
      setProgress(20)

      const pieces = await sliceImage(originalImage, grid, pieceCount ?? 100)

      setProgress(80)
      setMessage('Building colour library...')

      // Small tick so progress renders before we navigate
      await new Promise(r => setTimeout(r, 50))

      setProgress(100)
      setMessage('Ready!')

      await new Promise(r => setTimeout(r, 200))

      setPieces(pieces)
      setStartTime(Date.now())
      setStatus('solving')
      navigate('/solving')
    }

    run()
  }, [])

  return (
    <AppShell>
      <Card className="w-full max-w-sm flex flex-col items-center gap-8 text-center">

        <div className="text-6xl animate-bounce">🧩</div>

        <div className="flex flex-col gap-2 w-full">
          <PixelText text={`${progress}%`} size="lg" />
          <p className="font-body text-sky-500 text-sm">{message}</p>
        </div>

        <div className="w-full flex flex-col gap-2">
          <ProgressBar value={progress} />
          <p className="font-body text-sky-400 text-xs">
            Runs entirely in your browser · no uploads needed
          </p>
        </div>

      </Card>
    </AppShell>
  )
}
