import { useState } from 'react'
import { useGameStore, SHOP_ITEMS } from '../store/gameStore'

export function Shop() {
  const totalCoins = useGameStore(s => s.totalCoins)
  const owned = useGameStore(s => s.owned)
  const buyItem = useGameStore(s => s.buyItem)
  const setPhase = useGameStore(s => s.setPhase)
  const [flash, setFlash] = useState<string | null>(null)

  const handleBuy = (id: string) => {
    const ok = buyItem(id)
    if (ok) {
      setFlash(id)
      setTimeout(() => setFlash(null), 600)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      zIndex: 20, overflow: 'auto',
      background: 'radial-gradient(ellipse at 50% 40%, #e8dcc0 0%, #d4c8a8 60%, #b8a888 100%)',
      fontFamily: '"STKaiti", "KaiTi", "楷体", "SimSun", serif',
    }}>
      {/* 顶部：标题 + 灵石数 + 返回 */}
      <div style={{
        width: '100%', maxWidth: '500px', padding: '24px 20px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button onClick={() => setPhase('menu')}
          style={{
            background: 'none', border: 'none', color: '#5a4a30',
            fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
            letterSpacing: '2px',
          }}
        >
          ← 返回
        </button>
        <div style={{
          color: '#4a7a5a', fontSize: '18px', fontWeight: 'bold',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{
            display: 'inline-block', width: '14px', height: '14px',
            background: 'radial-gradient(circle at 35% 35%, #8abaa0, #4a7a5a)',
            borderRadius: '2px', transform: 'rotate(45deg)',
          }} />
          {totalCoins}
        </div>
      </div>

      {/* 标题 */}
      <div style={{
        fontSize: 'clamp(28px, 6vw, 40px)', color: '#2a2018',
        letterSpacing: '10px', margin: '16px 0 8px',
      }}>
        藏 宝 库
      </div>

      {/* 分割线 */}
      <div style={{
        width: '120px', height: '1px',
        background: 'linear-gradient(90deg, transparent, #5a4a30, transparent)',
        marginBottom: '28px',
      }} />

      {/* 商品列表 */}
      <div style={{
        width: '100%', maxWidth: '460px', padding: '0 20px 40px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        {SHOP_ITEMS.map(item => {
          const isBought = owned.includes(item.id)
          const canAfford = totalCoins >= item.cost
          const justBought = flash === item.id

          return (
            <div key={item.id} style={{
              border: `1.5px solid ${isBought ? 'rgba(90,122,90,0.3)' : 'rgba(74,60,40,0.15)'}`,
              background: isBought ? 'rgba(90,122,90,0.05)' : 'rgba(255,255,255,0.3)',
              padding: '16px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'all 0.3s',
              transform: justBought ? 'scale(1.02)' : 'scale(1)',
            }}>
              {/* 左侧：名称+描述 */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '18px', color: '#2a2018',
                  marginBottom: '4px', letterSpacing: '3px',
                }}>
                  {item.name}
                  {isBought && (
                    <span style={{
                      fontSize: '11px', color: '#5a7a5a',
                      marginLeft: '8px', letterSpacing: '1px',
                    }}>
                      已习得
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '12px', color: 'rgba(74,60,40,0.5)',
                  letterSpacing: '1px',
                }}>
                  {item.desc}
                </div>
              </div>

              {/* 右侧：价格/已购 */}
              {isBought ? (
                <div style={{
                  color: '#5a7a5a', fontSize: '13px',
                  border: '1px solid rgba(90,122,90,0.2)',
                  padding: '6px 14px', letterSpacing: '2px',
                }}>
                  ✓
                </div>
              ) : (
                <button
                  onClick={() => handleBuy(item.id)}
                  disabled={!canAfford}
                  style={{
                    background: canAfford ? 'rgba(74,60,40,0.06)' : 'transparent',
                    border: `1.5px solid ${canAfford ? '#5a4a30' : 'rgba(74,60,40,0.1)'}`,
                    color: canAfford ? '#3a2a18' : 'rgba(74,60,40,0.25)',
                    fontSize: '14px', padding: '6px 16px',
                    cursor: canAfford ? 'pointer' : 'default',
                    fontFamily: 'inherit', letterSpacing: '2px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '10px', height: '10px',
                    background: canAfford
                      ? 'radial-gradient(circle at 35% 35%, #8abaa0, #4a7a5a)'
                      : 'rgba(120,110,90,0.2)',
                    borderRadius: '1px', transform: 'rotate(45deg)',
                  }} />
                  {item.cost}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* 底部说明 */}
      <div style={{
        color: 'rgba(74,60,40,0.3)', fontSize: '11px',
        letterSpacing: '2px', paddingBottom: '30px',
      }}>
        灵石可通过跑酷收集，永久生效
      </div>
    </div>
  )
}
