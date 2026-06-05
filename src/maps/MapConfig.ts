import type { ObstacleType } from '../obstacles/ObstacleManager'

export interface MapConfig {
  id: string
  name: string
  desc: string
  difficulty: number       // 1-3 星

  // 场景
  background: number
  fogColor: number
  fogNear: number
  fogFar: number

  // 灯光
  ambientColor: number
  ambientIntensity: number
  dirLightColor: number
  dirLightIntensity: number
  fillLightColor: number
  hemisphereSky: number
  hemisphereGround: number

  // 地板
  floorColor: number
  floorRoughness: number
  floorLineColor: number
  floorEdgeColor: number
  floorEmissive: number
  floorEmissiveIntensity: number

  // 环境
  mountainColors: [number, number, number]
  cliffColor: number
  groundColor: number
  cloudColor: number
  cloudOpacity: number
  particleColor: number
  particleSize: number
  speedLineColor: number

  // 玩法
  speedMultiplier: number
  obstacleDensity: number   // 间距乘值（越大越稀疏）
  obstacleWeights: Record<ObstacleType, number>
}

// ── 三张地图 ────────────────────────────────────────────

const inkMap: MapConfig = {
  id: 'ink',
  name: '墨 境',
  desc: '水墨山水，青石古道',
  difficulty: 2,
  background: 0xd4c8a8,
  fogColor: 0xc8bca0,
  fogNear: 30,
  fogFar: 120,
  ambientColor: 0xfff5e0,
  ambientIntensity: 2.5,
  dirLightColor: 0xffe8c0,
  dirLightIntensity: 3,
  fillLightColor: 0xffe0b0,
  hemisphereSky: 0xc8d8f0,
  hemisphereGround: 0x8b7355,
  floorColor: 0x7a8a7a,
  floorRoughness: 0.85,
  floorLineColor: 0x5a6a5a,
  floorEdgeColor: 0x4a5a4a,
  floorEmissive: 0x1a2a1a,
  floorEmissiveIntensity: 0.15,
  mountainColors: [0xb0a890, 0x8a7a60, 0x6a5a40],
  cliffColor: 0x5a5040,
  groundColor: 0x7a8a5a,
  cloudColor: 0xe8e0d0,
  cloudOpacity: 0.5,
  particleColor: 0x8a7a60,
  particleSize: 0.12,
  speedLineColor: 0x6a5a40,
  speedMultiplier: 1,
  obstacleDensity: 1,
  obstacleWeights: { stone: 1, beast: 1, swordgate: 1, flysword: 1 },
}

const underworldMap: MapConfig = {
  id: 'underworld',
  name: '幽 冥',
  desc: '暗紫深蓝，剑影幽光',
  difficulty: 3,
  background: 0x0d0d1a,
  fogColor: 0x0a0a18,
  fogNear: 20,
  fogFar: 80,
  ambientColor: 0x3040a0,
  ambientIntensity: 1.8,
  dirLightColor: 0x6070cc,
  dirLightIntensity: 2.5,
  fillLightColor: 0x2030a0,
  hemisphereSky: 0x1a1a40,
  hemisphereGround: 0x0a0a15,
  floorColor: 0x1a1a2e,
  floorRoughness: 0.7,
  floorLineColor: 0x2a2a4a,
  floorEdgeColor: 0x1a1a3a,
  floorEmissive: 0x0a0a1a,
  floorEmissiveIntensity: 0.3,
  mountainColors: [0x1a1030, 0x150e28, 0x100a20],
  cliffColor: 0x12101e,
  groundColor: 0x0a0a15,
  cloudColor: 0x1a1840,
  cloudOpacity: 0.3,
  particleColor: 0x4060cc,
  particleSize: 0.08,
  speedLineColor: 0x4050aa,
  speedMultiplier: 1.2,
  obstacleDensity: 0.75,
  obstacleWeights: { stone: 0.8, beast: 0.6, swordgate: 1.2, flysword: 2 },
}

const peachMap: MapConfig = {
  id: 'peach',
  name: '桃 花 源',
  desc: '落英缤纷，春风和煦',
  difficulty: 1,
  background: 0xf0e8e0,
  fogColor: 0xe8ddd0,
  fogNear: 40,
  fogFar: 150,
  ambientColor: 0xffe8f0,
  ambientIntensity: 2.8,
  dirLightColor: 0xffd8e0,
  dirLightIntensity: 2.5,
  fillLightColor: 0xffe0d0,
  hemisphereSky: 0xe0f0ff,
  hemisphereGround: 0x90b070,
  floorColor: 0xc8a878,
  floorRoughness: 0.8,
  floorLineColor: 0xb09060,
  floorEdgeColor: 0xa08050,
  floorEmissive: 0x2a1a0a,
  floorEmissiveIntensity: 0.1,
  mountainColors: [0xc0d0a0, 0x90b070, 0x708a50],
  cliffColor: 0x8a9a6a,
  groundColor: 0xa0c080,
  cloudColor: 0xffffff,
  cloudOpacity: 0.6,
  particleColor: 0xffa0b0,
  particleSize: 0.15,
  speedLineColor: 0xd0a0a0,
  speedMultiplier: 0.85,
  obstacleDensity: 1.3,
  obstacleWeights: { stone: 0.6, beast: 2, swordgate: 0.8, flysword: 0.5 },
}

// ── 导出 ──────────────────────────────────────────────

export const MAPS: MapConfig[] = [inkMap, underworldMap, peachMap]
export const MAP_BY_ID: Record<string, MapConfig> = Object.fromEntries(MAPS.map(m => [m.id, m]))
export const DEFAULT_MAP_ID = 'ink'
