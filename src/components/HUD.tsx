import { useGameStore } from '../store/gameStore'
import { INITIAL_SPEED, MAX_SPEED } from '../utils/constants'

export function HUD({ onPause }: { onPause: () => void }) {
  const score = useGameStore(s => s.score)
  const coins = useGameStore(s => s.coins)
  const speed = useGameStore(s => s.speed)
  const jumpsLeft = useGameStore(s => s.jumpsLeft)
  const lives = useGameStore(s => s.lives)
  const maxLives = useGameStore(s => s.getMaxLives())
  const maxJumps = useGameStore(s => s.getMaxJumps())
  const invincible = useGameStore(s => s.invincible)
  const forkActive = useGameStore(s => s.forkActive)
  const combo = useGameStore(s => s.combo)
  const comboTimer = useGameStore(s => s.comboTimer)
  const milestoneMessage = useGameStore(s => s.milestoneMessage)
  const magnetTimer = useGameStore(s => s.magnetTimer)
  const shieldPickupTimer = useGameStore(s => s.shieldPickupTimer)

  const speedPct = Math.min(((speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED)) * 100, 100)
  const speedColor = speedPct > 70 ? '#8a4a3a' : speedPct > 40 ? '#7a6a50' : '#5a7a5a'

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10,
      fontFamily: '"STKaiti", "KaiTi", "楷体", "SimSun", serif',
    }}>
      {/* 顶部栏 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 22px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        background: 'linear-gradient(180deg, rgba(212,200,168,0.6) 0%, transparent 100%)',
      }}>
        {/* 修为 */}
        <div>
          <div style={{ color: 'rgba(74,60,40,0.5)', fontSize: '11px', letterSpacing: '4px', marginBottom: '2px' }}>
            修 为
          </div>
          <div style={{
            color: '#4a3a28', fontSize: '28px', fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            letterSpacing: '2px', lineHeight: 1,
          }}>
            {Math.floor(score).toString().padStart(6, '0')}
            <span style={{ fontSize: '12px', marginLeft: '4px', opacity: 0.6 }}>里</span>
          </div>
        </div>

        {/* 命 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(140,50,50,0.5)', fontSize: '11px', letterSpacing: '4px', marginBottom: '2px' }}>
            性 命
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {Array.from({ length: maxLives }).map((_, i) => (
              <div key={i} style={{
                width: '20px', height: '20px',
                background: i < lives
                  ? 'radial-gradient(circle at 40% 40%, #cc5544, #883322)'
                  : 'rgba(150,130,110,0.3)',
                borderRadius: '50%',
                boxShadow: i < lives ? '0 0 6px rgba(140,50,50,0.3)' : 'none',
                border: '1px solid rgba(140,100,80,0.3)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
          {invincible && (
            <div style={{
              color: '#8a6a4a', fontSize: '10px', letterSpacing: '2px', marginTop: '4px',
            }}>
              护体
            </div>
          )}
        </div>

        {/* 灵石 */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(90,120,90,0.5)', fontSize: '11px', letterSpacing: '4px', marginBottom: '2px' }}>
            灵 石
          </div>
          <div style={{
            color: '#4a7a5a', fontSize: '22px', fontWeight: 'bold',
            display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end',
          }}>
            <span style={{
              display: 'inline-block', width: '16px', height: '16px',
              background: 'radial-gradient(circle at 35% 35%, #8abaa0, #4a7a5a)',
              borderRadius: '3px', transform: 'rotate(45deg)',
              flexShrink: 0, border: '1px solid rgba(90,120,90,0.3)',
            }} />
            {coins}
          </div>
        </div>
      </div>

      {/* 灵力条（右侧） */}
      <div style={{
        position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
      }}>
        <div style={{ color: 'rgba(74,60,40,0.3)', fontSize: '9px', letterSpacing: '2px', writingMode: 'vertical-rl' }}>
          灵 力
        </div>
        <div style={{
          width: '4px', height: '80px',
          background: 'rgba(74,60,40,0.1)',
          borderRadius: '2px', overflow: 'hidden',
          border: '1px solid rgba(74,60,40,0.15)',
        }}>
          <div style={{
            width: '100%', height: `${speedPct}%`,
            background: `linear-gradient(0deg, ${speedColor}, ${speedColor}88)`,
            borderRadius: '2px', transition: 'height 0.3s ease',
            marginTop: `${100 - speedPct}%`,
          }} />
        </div>
        <div style={{ color: speedColor, fontSize: '9px', fontWeight: 'bold' }}>
          {Math.floor(speed)}
        </div>
      </div>

      {/* 轻功指示 */}
      <div style={{
        position: 'absolute', bottom: '22px', left: '18px',
        display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start',
      }}>
        <div style={{ color: 'rgba(74,60,40,0.35)', fontSize: '10px', letterSpacing: '3px' }}>轻功</div>
        <div style={{ display: 'flex', gap: '5px' }}>
          {Array.from({ length: maxJumps }).map((_, i) => (
            <div key={i} style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: i < jumpsLeft
                ? 'radial-gradient(circle at 40% 40%, #8a7a60, #5a4a30)'
                : 'rgba(120,110,90,0.15)',
              boxShadow: i < jumpsLeft ? '0 0 4px rgba(120,100,70,0.3)' : 'none',
              border: '1px solid rgba(74,60,40,0.2)',
              transition: 'all 0.15s',
            }} />
          ))}
        </div>
      </div>

      {/* 岔路指示 */}
      {forkActive && (
        <div style={{
          position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '24px', alignItems: 'center',
          animation: 'pulse 1.2s ease-in-out infinite',
        }}>
          <div style={{
            color: 'rgba(180,160,80,0.8)', fontSize: '22px',
            textShadow: '0 0 8px rgba(180,160,80,0.4)',
          }}>
            ← 左
          </div>
          <div style={{
            color: 'rgba(74,60,40,0.4)', fontSize: '11px', letterSpacing: '2px',
          }}>
            选择道路
          </div>
          <div style={{
            color: 'rgba(180,160,80,0.8)', fontSize: '22px',
            textShadow: '0 0 8px rgba(180,160,80,0.4)',
          }}>
            右 →
          </div>
        </div>
      )}

      {/* 连击指示 */}
      {combo > 1 && (
        <div style={{
          position: 'absolute', top: '120px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          transition: 'opacity 0.3s',
          opacity: comboTimer > 0.5 ? 1 : comboTimer * 2,
        }}>
          <div style={{
            color: '#8a6a3a', fontSize: '28px', fontWeight: 'bold',
            textShadow: '0 0 12px rgba(180,140,60,0.5)',
            letterSpacing: '2px',
          }}>
            连击 x{combo}
          </div>
          <div style={{
            width: '60px', height: '3px', marginTop: '4px',
            background: 'rgba(74,60,40,0.15)', borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              width: `${(comboTimer / 2) * 100}%`, height: '100%',
              background: '#8a6a3a', borderRadius: '2px',
              transition: 'width 0.1s linear',
            }} />
          </div>
        </div>
      )}

      {/* 里程碑消息 */}
      {milestoneMessage && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#6a5a30', fontSize: '32px', fontWeight: 'bold',
          letterSpacing: '6px',
          textShadow: '0 0 20px rgba(180,160,80,0.6)',
          animation: 'milestoneIn 0.5s ease-out',
          pointerEvents: 'none',
        }}>
          {milestoneMessage}
        </div>
      )}

      {/* 道具状态指示 */}
      {(magnetTimer > 0 || shieldPickupTimer > 0) && (
        <div style={{
          position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '12px',
        }}>
          {magnetTimer > 0 && (
            <div style={{
              color: '#cc4444', fontSize: '12px', letterSpacing: '2px',
              background: 'rgba(204,68,68,0.1)', padding: '4px 12px',
              border: '1px solid rgba(204,68,68,0.3)',
            }}>
              磁铁 {Math.ceil(magnetTimer)}s
            </div>
          )}
          {shieldPickupTimer > 0 && (
            <div style={{
              color: '#4488ff', fontSize: '12px', letterSpacing: '2px',
              background: 'rgba(68,136,255,0.1)', padding: '4px 12px',
              border: '1px solid rgba(68,136,255,0.3)',
            }}>
              护盾 {Math.ceil(shieldPickupTimer)}s
            </div>
          )}
        </div>
      )}

      {/* 暂停按钮 */}
      <button
        onClick={onPause}
        style={{
          position: 'absolute', bottom: '22px', right: '18px',
          pointerEvents: 'auto',
          background: 'rgba(74,60,40,0.08)',
          border: '1.5px solid rgba(74,60,40,0.25)',
          color: '#5a4a30',
          fontSize: '18px', lineHeight: 1,
          width: '36px', height: '36px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,60,40,0.15)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,60,40,0.08)' }}
      >
        ❚❚
      </button>
    </div>
  )
}
