import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import PixelText from '../components/ui/PixelText'
import ProgressBar from '../components/ui/ProgressBar'
import { usePuzzleStore } from '../store/puzzleStore'
import { sliceImage } from '../utils/sliceImage'
import { useEmbeddings } from '../hooks/useEmbeddings'

export default function ProcessingPage() {
  const navigate = useNavigate()
  const { originalImage, grid, setPieces, setStatus, setStartTime } = usePuzzleStore()
  const { generateEmbeddings, progress } = useEmbeddings()
  const hasStarted = useRef(false)

  useEffect(() => {
    if (!originalImage || !grid) {
      navigate('/')
      return
    }
    if (hasStarted.current) return
    hasStarted.current = true

    const run = async () => {
      const pieces = await sliceImage(originalImage, grid)

      await generateEmbeddings(pieces, (donePieces) => {
        setPieces(donePieces)
        setStartTime(Date.now())
        setStatus('solving')
        navigate('/solving')
      })
    }

    run()
  }, [])

  const getMessage = () => {
    if (progress < 20) return 'Loading AI model...'
    if (progress < 50) return 'Analysing pieces...'
    if (progress < 80) return 'Almost there...'
    return 'Finalising...'
  }

  return (
    <AppShell>
      <Card className="w-full max-w-sm flex flex-col items-center gap-8 text-center">

        {/* Animated puzzle icon */}
        <div className="text-6xl animate-bounce">🧩</div>

        <div className="flex flex-col gap-2 w-full">
          <PixelText text={`${progress}%`} size="lg" />
          <p className="font-body text-sky-500 text-sm">{getMessage()}</p>
        </div>

        <div className="w-full flex flex-col gap-2">
          <ProgressBar value={progress} />
          <p className="font-body text-sky-400 text-xs">
            This only happens once per puzzle
          </p>
        </div>

      </Card>
    </AppShell>
  )
}