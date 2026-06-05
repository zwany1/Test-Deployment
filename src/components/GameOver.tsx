import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'

export function GameOver() {
  const score = useGameStore(s => s.score)
  const coins = useGameStore(s => s.coins)
  const bestScore = useGameStore(s => s.bestScore)
  const setPhase = useGameStore(s => s.setPhase)
  const reset = useGameStore(s => s.reset)

  const isNewBest = Math.floor(score) >= bestScore && bestScore > 0
  const [retryHover, setRetryHover] = useState(false)
  const [menuHover, setMenuHover] = useState(false)

  // 分数滚动动画
  const [displayScore, setDisplayScore] = useState(0)
  const [displayCoins, setDisplayCoins] = useState(0)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const targetScore = Math.floor(score)
    const targetCoins = coins
    const duration = 1200 // 毫秒
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // easeOutExpo 缓动
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplayScore(Math.floor(targetScore * ease))
      setDisplayCoins(Math.floor(targetCoins * ease))
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [score, coins])

  const handleRestart = () => { reset(); setPhase('playing') }
  const handleMenu = () => { reset(); setPhase('menu') }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 20,
      background: 'radial-gradient(ellipse at center, rgba(180,160,130,0.95) 0%, rgba(212,200,168,0.98) 100%)',
      fontFamily: '"STKaiti", "KaiTi", "楷体", "SimSun", serif',
    }}>
      {/* 墨迹背景 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 40%, rgba(42,32,24,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* 道陨 */}
      <div style={{
        fontSize: 'clamp(38px, 9vw, 72px)', fontWeight: 400, letterSpacing: '14px',
        color: '#3a2a18',
        textShadow: '2px 2px 6px rgba(0,0,0,0.08)',
        marginBottom: isNewBest ? '20px' : '40px',
      }}>
        道 陨
      </div>

      {isNewBest && (
        <div style={{
          color: '#8a6a3a', fontSize: '15px', letterSpacing: '6px',
          marginBottom: '28px',
        }}>
          突破新境
        </div>
      )}

      {/* 成绩面板 */}
      <div style={{
        border: '1px solid rgba(74,60,40,0.2)',
        padding: '28px 52px', marginBottom: '40px',
        background: 'rgba(74,60,40,0.03)',
        minWidth: '280px',
      }}>
        <StatRow label="修 为" value={`${displayScore}里`} color="#4a3a28" />
        <StatRow label="灵 石" value={`${displayCoins}`} color="#4a7a5a" />
        <StatRow label="最 高" value={`${bestScore}里`} color="#6a4a6a" />
      </div>

      {/* 按钮 */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <Btn label="再入仙途" hover={retryHover}
          onEnter={() => setRetryHover(true)} onLeave={() => setRetryHover(false)} onClick={handleRestart} />
        <Btn label="返回洞府" hover={menuHover}
          onEnter={() => setMenuHover(true)} onLeave={() => setMenuHover(false)} onClick={handleMenu} />
      </div>

      {/* 朱砂印章 */}
      <div style={{
        position: 'absolute', top: '30px', left: '40px',
        width: '45px', height: '45px',
        border: '2px solid rgba(180,50,50,0.15)',
        borderRadius: '4px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(180,50,50,0.2)', fontSize: '16px',
        transform: 'rotate(-8deg)',
      }}>
        陨
      </div>
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: '40px', padding: '6px 0', fontSize: '15px', letterSpacing: '2px',
      borderBottom: '1px solid rgba(74,60,40,0.06)',
    }}>
      <span style={{ color: 'rgba(74,60,40,0.4)', fontSize: '12px', letterSpacing: '4px' }}>{label}</span>
      <span style={{ color, fontWeight: 'bold' }}>{value}</span>
    </div>
  )
}

function Btn({ label, hover, onEnter, onLeave, onClick }: {
  label: string; hover: boolean;
  onEnter: () => void; onLeave: () => void; onClick: () => void;
}) {
  return (
    <button onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}
      style={{
        background: hover ? 'rgba(74,60,40,0.08)' : 'transparent',
        border: '1.5px solid #5a4a30', color: '#3a2a18',
        fontSize: '15px', letterSpacing: '6px', padding: '12px 36px',
        cursor: 'pointer', fontFamily: '"STKaiti", "KaiTi", "楷体", "SimSun", serif',
        transition: 'all 0.3s',
      }}
    >{label}</button>
  )
}
