import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import type { GameEngine } from '../systems/GameEngine'

export function PauseOverlay({ engineRef }: { engineRef: React.RefObject<GameEngine | null> }) {
  const paused = useGameStore(s => s.paused)
  const score = useGameStore(s => s.score)
  const coins = useGameStore(s => s.coins)
  const [hoverResume, setHoverResume] = useState(false)
  const [hoverLeave, setHoverLeave] = useState(false)

  if (!paused) return null

  const handleResume = () => {
    engineRef.current?.resume()
  }

  const handleLeave = () => {
    engineRef.current?.returnToLobby()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 30,
      background: 'radial-gradient(ellipse at center, rgba(180,160,130,0.92) 0%, rgba(212,200,168,0.96) 100%)',
      fontFamily: '"STKaiti", "KaiTi", "楷体", "SimSun", serif',
    }}>
      {/* 墨迹背景 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 40%, rgba(42,32,24,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* 暂停标题 */}
      <div style={{
        fontSize: 'clamp(36px, 8vw, 60px)', fontWeight: 400, letterSpacing: '14px',
        color: '#3a2a18',
        textShadow: '2px 2px 6px rgba(0,0,0,0.08)',
        marginBottom: '36px',
      }}>
        调 息
      </div>

      {/* 当前状态 */}
      <div style={{
        border: '1px solid rgba(74,60,40,0.2)',
        padding: '24px 48px', marginBottom: '36px',
        background: 'rgba(74,60,40,0.03)',
        minWidth: '240px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '32px', padding: '6px 0', fontSize: '15px', letterSpacing: '2px',
          borderBottom: '1px solid rgba(74,60,40,0.06)',
        }}>
          <span style={{ color: 'rgba(74,60,40,0.4)', fontSize: '12px', letterSpacing: '4px' }}>修 为</span>
          <span style={{ color: '#4a3a28', fontWeight: 'bold' }}>{Math.floor(score)}里</span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '32px', padding: '6px 0', fontSize: '15px', letterSpacing: '2px',
        }}>
          <span style={{ color: 'rgba(74,60,40,0.4)', fontSize: '12px', letterSpacing: '4px' }}>灵 石</span>
          <span style={{ color: '#4a7a5a', fontWeight: 'bold' }}>{coins}</span>
        </div>
      </div>

      {/* 按钮 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
        <button
          onClick={handleResume}
          onMouseEnter={() => setHoverResume(true)}
          onMouseLeave={() => setHoverResume(false)}
          style={{
            background: hoverResume ? 'rgba(74,60,40,0.08)' : 'transparent',
            border: '1.5px solid #5a4a30', color: '#3a2a18',
            fontSize: '16px', letterSpacing: '6px', padding: '12px 40px',
            cursor: 'pointer', fontFamily: '"STKaiti", "KaiTi", "楷体", "SimSun", serif',
            transition: 'all 0.3s', minWidth: '200px',
          }}
        >
          继续修炼
        </button>
        <button
          onClick={handleLeave}
          onMouseEnter={() => setHoverLeave(true)}
          onMouseLeave={() => setHoverLeave(false)}
          style={{
            background: hoverLeave ? 'rgba(74,60,40,0.08)' : 'transparent',
            border: '1.5px solid rgba(74,60,40,0.3)', color: 'rgba(74,60,40,0.6)',
            fontSize: '14px', letterSpacing: '4px', padding: '10px 32px',
            cursor: 'pointer', fontFamily: '"STKaiti", "KaiTi", "楷体", "SimSun", serif',
            transition: 'all 0.3s', minWidth: '200px',
          }}
        >
          携带灵石回府
        </button>
      </div>

      {/* 提示 */}
      <div style={{
        marginTop: '28px', color: 'rgba(74,60,40,0.3)', fontSize: '11px',
        letterSpacing: '2px',
      }}>
        按 ESC 继续修炼
      </div>
    </div>
  )
}
