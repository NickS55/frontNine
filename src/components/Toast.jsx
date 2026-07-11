import { useEffect, useRef, useState } from 'react'

const DURATION = 5000

export function Toast({ message, onUndo, onDismiss }) {
  const [progress, setProgress] = useState(100)
  const startRef  = useRef(Date.now())
  const frameRef  = useRef(null)
  const doneRef   = useRef(false)

  useEffect(() => {
    function tick() {
      const elapsed = Date.now() - startRef.current
      const pct     = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setProgress(pct)
      if (pct > 0) {
        frameRef.current = requestAnimationFrame(tick)
      } else if (!doneRef.current) {
        doneRef.current = true
        onDismiss()
      }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [onDismiss])

  function handleUndo() {
    doneRef.current = true
    cancelAnimationFrame(frameRef.current)
    onUndo()
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xl min-w-[280px]">
        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-primary transition-none"
          style={{ width: `${progress}%` }}
        />
        <div className="flex items-center gap-4 px-4 py-3">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleUndo}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Undo
            </button>
            <button
              onClick={() => { doneRef.current = true; cancelAnimationFrame(frameRef.current); onDismiss() }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
