import { useEffect, useRef } from 'react'
import { GameEngine } from '../systems/GameEngine'

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const engine = new GameEngine(canvas)
    engineRef.current = engine

    return () => {
      engine.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}
