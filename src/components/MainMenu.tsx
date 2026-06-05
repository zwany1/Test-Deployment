import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { MAP_BY_ID, DEFAULT_MAP_ID } from '../maps/MapConfig'

export function MainMenu() {
  const setPhase = useGameStore(s => s.setPhase)
  const reset = useGameStore(s => s.reset)
  const bestScore = useGameStore(s => s.bestScore)
  const selectedMapId = useGameStore(s => s.selectedMapId)
  const currentMap = MAP_BY_ID[selectedMapId] ?? MAP_BY_ID[DEFAULT_MAP_ID]

  // 墨迹晕染动画
  const [inkSpread, setInkSpread] = useState(0)
  useEffect(() => {
    let t = 0
    const id = setInterval(() => {
      t += 0.02
      setInkSpread(Math.min(1, t))
    }, 30)
    return () => clearInterval(id)
  }, [])

  // 落花飘落
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    interface Petal {
      x: number; y: number; r: number; speed: number; drift: number; rot: number; opacity: number
    }
    const petals: Petal[] = Array.from({ length: 25 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: 2 + Math.random() * 3,
      speed: 0.3 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 0.3,
      rot: Math.random() * Math.PI * 2,
      opacity: 0.15 + Math.random() * 0.2,
    }))

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of petals) {
        p.y += p.speed
        p.x += p.drift + Math.sin(p.y * 0.01) * 0.3
        p.rot += 0.01
        if (p.y > canvas.height + 10) { p.y = -10; p.x = Math.random() * canvas.width }

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = '#c8a080'
        ctx.beginPath()
        ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 20,
      background: 'radial-gradient(ellipse at 50% 50%, #e8dcc0 0%, #d4c8a8 60%, #b8a888 100%)',
      fontFamily: '"STKaiti", "KaiTi", "楷体", "SimSun", serif',
      overflow: 'hidden',
    }}>
      {/* 落花 canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* 墨迹背景装饰 */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: inkSpread * 0.08,
        background: `
          radial-gradient(ellipse at 20% 30%, #3a3020 0%, transparent 50%),
          radial-gradient(ellipse at 80% 70%, #3a3020 0%, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />

      {/* 竹影装饰 */}
      <div style={{
        position: 'absolute', left: '5%', top: '10%', bottom: '10%',
        width: '2px', background: 'rgba(90,110,70,0.15)',
      }} />
      <div style={{
        position: 'absolute', left: '8%', top: '20%', bottom: '15%',
        width: '1px', background: 'rgba(90,110,70,0.1)',
      }} />
      <div style={{
        position: 'absolute', right: '6%', top: '15%', bottom: '12%',
        width: '2px', background: 'rgba(90,110,70,0.12)',
      }} />

      {/* 标题 */}
      <div style={{
        fontSize: 'clamp(44px, 10vw, 88px)', fontWeight: 400, letterSpacing: '16px',
        color: '#2a2018',
        textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '8px', opacity: inkSpread,
        transform: `scale(${0.9 + inkSpread * 0.1})`,
        transition: 'opacity 0.5s, transform 0.5s',
      }}>
        🐖🐕历险记
      </div>

      {/* 副标题 */}
      <div style={{
        fontSize: '16px', color: '#6a5a40', letterSpacing: '12px',
        marginBottom: '20px', opacity: inkSpread,
      }}>
        激 情 四 射
      </div>

      {/* 水墨分割线 */}
      <div style={{
        width: `${180 * inkSpread}px`, height: '1px',
        background: 'linear-gradient(90deg, transparent, #5a4a30, transparent)',
        marginBottom: '36px', transition: 'width 0.8s',
      }} />

      {/* 最佳修为 */}
      {bestScore > 0 && (
        <div style={{
          color: '#5a4a30', fontSize: '15px', letterSpacing: '4px', marginBottom: '36px',
          border: '1px solid rgba(90,74,48,0.25)', padding: '8px 24px',
          background: 'rgba(90,74,48,0.04)',
        }}>
          最高修为 &nbsp; {bestScore}里
        </div>
      )}

      {/* 开始按钮 */}
      <StartButton onClick={() => { reset(); setPhase('playing') }} />

      {/* 当前仙途 + 选择入口 */}
      <button
        onClick={() => setPhase('mapselect')}
        style={{
          background: 'none', border: 'none',
          color: '#5a4a30', fontSize: '14px',
          cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: '4px', marginTop: '14px',
          display: 'flex', alignItems: 'center', gap: '8px',
          opacity: 0.8, transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => (e.target as HTMLButtonElement).style.opacity = '1'}
        onMouseLeave={e => (e.target as HTMLButtonElement).style.opacity = '0.8'}
      >
        <span style={{
          display: 'inline-block', width: '10px', height: '10px',
          background: `#${(currentMap.background >>> 0).toString(16).padStart(6, '0')}`,
          border: '1px solid rgba(74,60,40,0.2)',
        }} />
        {currentMap.name} · 选择仙途
      </button>

      {/* 藏宝库入口 */}
      <button
        onClick={() => setPhase('shop')}
        style={{
          background: 'none', border: 'none',
          color: '#6a5a40', fontSize: '14px',
          cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: '4px', marginTop: '12px',
          display: 'flex', alignItems: 'center', gap: '8px',
          opacity: 0.7, transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => (e.target as HTMLButtonElement).style.opacity = '1'}
        onMouseLeave={e => (e.target as HTMLButtonElement).style.opacity = '0.7'}
      >
        <span style={{
          display: 'inline-block', width: '10px', height: '10px',
          background: 'radial-gradient(circle at 35% 35%, #8abaa0, #4a7a5a)',
          borderRadius: '1px', transform: 'rotate(45deg)',
        }} />
        藏宝库
      </button>

      {/* 操作说明 */}
      <div style={{
        marginTop: '48px', color: 'rgba(74,60,40,0.35)', fontSize: '12px',
        letterSpacing: '2px', textAlign: 'center', lineHeight: '2.4',
      }}>
        <span style={{ color: 'rgba(74,60,40,0.6)' }}>A/D</span> 或 <span style={{ color: 'rgba(74,60,40,0.6)' }}>← →</span> 换道 &nbsp;|&nbsp;
        <span style={{ color: 'rgba(74,60,40,0.6)' }}>SPACE</span> 轻功（二段跳） &nbsp;|&nbsp;
        <span style={{ color: 'rgba(74,60,40,0.6)' }}>S/↓</span> 下蹲<br />
        两条性命 &nbsp;|&nbsp; 碰到妖物失去一命 &nbsp;|&nbsp; 护体期间无敌
      </div>

      {/* 底部印章装饰 */}
      <div style={{
        position: 'absolute', bottom: '30px', right: '40px',
        width: '50px', height: '50px',
        border: '2px solid rgba(180,50,50,0.2)',
        borderRadius: '4px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(180,50,50,0.25)', fontSize: '18px',
        transform: 'rotate(5deg)',
      }}>
        仙
      </div>
    </div>
  )
}

function StartButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'rgba(74,60,40,0.08)' : 'transparent',
        border: '1.5px solid #5a4a30', color: '#3a2a18',
        fontSize: '20px', letterSpacing: '12px', padding: '14px 52px',
        cursor: 'pointer', fontFamily: '"STKaiti", "KaiTi", "楷体", "SimSun", serif',
        transition: 'all 0.3s', position: 'relative',
      }}
    >
      踏入仙途
    </button>
  )
}
