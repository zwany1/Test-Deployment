import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { MAPS } from '../maps/MapConfig'

export function MapSelect() {
  const selectedMapId = useGameStore(s => s.selectedMapId)
  const setSelectedMap = useGameStore(s => s.setSelectedMap)
  const setPhase = useGameStore(s => s.setPhase)
  const [hoverId, setHoverId] = useState<string | null>(null)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      zIndex: 20, overflow: 'auto',
      background: 'radial-gradient(ellipse at 50% 40%, #e8dcc0 0%, #d4c8a8 60%, #b8a888 100%)',
      fontFamily: '"STKaiti", "KaiTi", "楷体", "SimSun", serif',
    }}>
      {/* 顶部 */}
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
      </div>

      <div style={{
        fontSize: 'clamp(28px, 6vw, 40px)', color: '#2a2018',
        letterSpacing: '10px', margin: '16px 0 8px',
      }}>
        选 择 仙 途
      </div>

      <div style={{
        width: '120px', height: '1px',
        background: 'linear-gradient(90deg, transparent, #5a4a30, transparent)',
        marginBottom: '28px',
      }} />

      {/* 地图卡片 */}
      <div style={{
        width: '100%', maxWidth: '460px', padding: '0 20px 40px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        {MAPS.map(map => {
          const isSelected = selectedMapId === map.id
          const isHover = hoverId === map.id

          return (
            <button
              key={map.id}
              onClick={() => { setSelectedMap(map.id); setPhase('menu') }}
              onMouseEnter={() => setHoverId(map.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                border: `1.5px solid ${isSelected ? 'rgba(90,122,90,0.5)' : isHover ? 'rgba(74,60,40,0.3)' : 'rgba(74,60,40,0.15)'}`,
                background: isSelected ? 'rgba(90,122,90,0.08)' : isHover ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)',
                padding: '16px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.3s', textAlign: 'left',
                transform: isHover ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              {/* 左侧 */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '20px', color: '#2a2018',
                  marginBottom: '4px', letterSpacing: '4px',
                }}>
                  {map.name}
                  {isSelected && (
                    <span style={{
                      fontSize: '11px', color: '#5a7a5a',
                      marginLeft: '8px', letterSpacing: '1px',
                    }}>
                      已选
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '12px', color: 'rgba(74,60,40,0.5)',
                  letterSpacing: '1px', marginBottom: '6px',
                }}>
                  {map.desc}
                </div>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} style={{
                      fontSize: '12px',
                      color: i < map.difficulty ? '#8a6a3a' : 'rgba(74,60,40,0.15)',
                    }}>
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* 右侧：预览色块 */}
              <div style={{
                width: '48px', height: '48px',
                background: `radial-gradient(circle at 35% 35%, #${(map.background >>> 0).toString(16).padStart(6, '0')}, #${(map.fogColor >>> 0).toString(16).padStart(6, '0')})`,
                border: '1px solid rgba(74,60,40,0.15)',
                marginLeft: '16px', flexShrink: 0,
              }} />
            </button>
          )
        })}
      </div>

      <div style={{
        color: 'rgba(74,60,40,0.3)', fontSize: '11px',
        letterSpacing: '2px', paddingBottom: '30px',
      }}>
        不同仙途，各有险境
      </div>
    </div>
  )
}
