import { useEffect, useRef } from 'react'
import { useGameStore } from './store/gameStore'
import { GameEngine } from './systems/GameEngine'
import { HUD } from './components/HUD'
import { MainMenu } from './components/MainMenu'
import { GameOver } from './components/GameOver'
import { Shop } from './components/Shop'
import { PauseOverlay } from './components/PauseOverlay'
import { MapSelect } from './components/MapSelect'

export default function App() {
  const phase = useGameStore(s => s.phase)
  const selectedMapId = useGameStore(s => s.selectedMapId)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)

  // 创建/重建引擎
  useEffect(() => {
    const canvas = canvasRef.current!
    const engine = new GameEngine(canvas, selectedMapId)
    engineRef.current = engine
    return () => {
      engine.dispose()
    }
  }, [])  // 仅挂载时创建

  // 进入 playing 时启动游戏
  useEffect(() => {
    if (phase === 'playing') {
      engineRef.current?.start()
    }
  }, [phase])

  return (
    <>
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
      {phase === 'playing' && <HUD onPause={() => engineRef.current?.pause()} />}
      {phase === 'playing' && <PauseOverlay engineRef={engineRef} />}
      {phase === 'menu' && <MainMenu />}
      {phase === 'dead' && <GameOver />}
      {phase === 'shop' && <Shop />}
      {phase === 'mapselect' && <MapSelect />}
    </>
  )
}
