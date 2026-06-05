import * as THREE from 'three'
import { LANES, SPAWN_Z, DESPAWN_Z, COIN_FLOAT_Y, OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP, POWERUP_SPAWN_CHANCE } from '../utils/constants'
import type { MapConfig } from '../maps/MapConfig'
import type { PowerupType } from '../store/gameStore'

export type ObstacleType = 'stone' | 'beast' | 'swordgate' | 'flysword'

export interface GameEntity {
  mesh: THREE.Mesh | THREE.Group
  lane: number
  type: 'obstacle' | 'coin' | 'powerup'
  active: boolean
  hw: number
  hh: number
  hd: number
  animData?: AnimData
  powerupType?: PowerupType
}

interface AnimData {
  originY: number
  phase: number
  kind: string
  parts?: THREE.Object3D[]
}

export class ObstacleManager {
  private scene: THREE.Scene
  private entities: GameEntity[] = []
  private nextSpawnZ: number
  private mat: Record<string, THREE.Material>
  private config: MapConfig

  constructor(scene: THREE.Scene, startZ: number, map: MapConfig) {
    this.scene = scene
    this.nextSpawnZ = startZ + 20
    this.config = map

    // ── 材质（基于地图配置调整色调）──
    const tint = (base: number, factor: number) => {
      const r = ((base >> 16) & 0xff) * factor | 0
      const g = ((base >> 8) & 0xff) * factor | 0
      const b = (base & 0xff) * factor | 0
      return (r << 16) | (g << 8) | b
    }

    const stoneMat = new THREE.MeshStandardMaterial({
      color: tint(0x6a6060, 0.9), roughness: 0.9, metalness: 0.05,
      emissive: 0x1a1510, emissiveIntensity: 0.1,
    })
    const stoneDarkMat = new THREE.MeshStandardMaterial({
      color: tint(0x3a3530, 0.85), roughness: 0.95, metalness: 0,
    })

    const woodMat = new THREE.MeshStandardMaterial({
      color: tint(0x7a6050, 0.95), roughness: 0.85, metalness: 0,
      emissive: 0x2a1a10, emissiveIntensity: 0.1,
    })
    const woodDarkMat = new THREE.MeshStandardMaterial({
      color: tint(0x4a3a2a, 0.9), roughness: 0.9, metalness: 0,
    })

    const inkMat = new THREE.MeshStandardMaterial({
      color: tint(0x2a2520, 0.8), roughness: 0.7, metalness: 0.05,
    })

    const sealRedMat = new THREE.MeshStandardMaterial({
      color: 0xcc3333, roughness: 0.6, metalness: 0.1,
      emissive: 0x441111, emissiveIntensity: 0.3,
    })

    const jadeMat = new THREE.MeshStandardMaterial({
      color: 0x5a8a6a, roughness: 0.3, metalness: 0.2,
      emissive: 0x1a3a2a, emissiveIntensity: 0.5,
    })

    const coinMat = new THREE.MeshStandardMaterial({
      color: 0x5a9a7a, roughness: 0.25, metalness: 0.3,
      emissive: 0x2a5a3a, emissiveIntensity: 1.2,
    })
    const coinGlowMat = new THREE.MeshBasicMaterial({
      color: 0x8abaa0, transparent: true, opacity: 0.2,
      depthWrite: false,
    })

    this.mat = {
      stone: stoneMat, stoneDark: stoneDarkMat,
      wood: woodMat, woodDark: woodDarkMat,
      ink: inkMat,
      sealRed: sealRedMat, jade: jadeMat,
      coin: coinMat, coinGlow: coinGlowMat,
    }
  }

  applyMap(map: MapConfig) {
    this.config = map
  }

  update(playerZ: number, _speed: number, xDrift: number) {
    const density = this.config.obstacleDensity
    while (this.nextSpawnZ < playerZ + SPAWN_Z) {
      this.spawnGroup(this.nextSpawnZ, xDrift)
      const gap = (OBSTACLE_MIN_GAP + Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP)) * density
      this.nextSpawnZ += gap
    }
    const now = performance.now() * 0.001
    for (const e of this.entities) {
      if (!e.active) continue
      if (e.mesh.position.z < playerZ + DESPAWN_Z) { this.despawn(e); continue }
      if (e.animData) this.tickAnimation(e, now)
    }
  }

  getActiveEntities(): GameEntity[] { return this.entities.filter(e => e.active) }
  removeEntity(e: GameEntity) { this.despawn(e) }

  clearNearby(playerZ: number, range: number) {
    for (const e of this.entities) {
      if (!e.active || e.type !== 'obstacle') continue
      if (e.mesh.position.z - playerZ > 0 && e.mesh.position.z - playerZ < range) this.despawn(e)
    }
  }

  reset(startZ: number) {
    for (const e of this.entities) this.despawn(e)
    this.entities = []
    this.nextSpawnZ = startZ + 20
  }

  // ── 生成 ──────────────────────────────────────────────

  private spawnGroup(z: number, xDrift: number) {
    const rand = Math.random()
    if (rand < 0.3) {
      this.spawnObstacle(z, Math.floor(Math.random() * 3), this.randomType(), xDrift)
    } else if (rand < 0.5) {
      const t = this.randomType()
      this.spawnObstacle(z, 0, t, xDrift)
      this.spawnObstacle(z, 2, t, xDrift)
    } else if (rand < 0.65) {
      const lane = Math.floor(Math.random() * 3)
      for (let i = 0; i < 5; i++) this.spawnCoin(z + i * 2.2, lane, xDrift)
    } else if (rand < 0.8) {
      for (let i = 0; i < 3; i++) this.spawnCoin(z + i * 2, i, xDrift)
    } else if (rand < 0.9) {
      const cl = Math.floor(Math.random() * 3)
      const ol = (cl + 1 + Math.floor(Math.random() * 2)) % 3
      for (let i = 0; i < 3; i++) this.spawnCoin(z + i * 2, cl, xDrift)
      this.spawnObstacle(z + 5, ol, this.randomType(), xDrift)
    } else {
      this.spawnObstacle(z, Math.floor(Math.random() * 3), 'swordgate', xDrift)
    }

    // 随机生成道具
    if (Math.random() < POWERUP_SPAWN_CHANCE) {
      const ptype: PowerupType = Math.random() < 0.5 ? 'magnet' : 'shield'
      const lane = Math.floor(Math.random() * 3)
      this.spawnPowerup(z + 3, lane, ptype, xDrift)
    }
  }

  private randomType(): ObstacleType {
    const w = this.config.obstacleWeights
    const entries: [ObstacleType, number][] = [
      ['stone', w.stone],
      ['beast', w.beast],
      ['swordgate', w.swordgate],
      ['flysword', w.flysword],
    ]
    const total = entries.reduce((s, [, v]) => s + v, 0)
    let r = Math.random() * total
    for (const [type, weight] of entries) {
      r -= weight
      if (r <= 0) return type
    }
    return 'stone'
  }

  // ── 障碍物 ────────────────────────────────────────────

  private spawnObstacle(z: number, lane: number, type: ObstacleType, xDrift: number) {
    const { mesh, hw, hh, hd, animData } = this.build(type)
    const y = animData?.originY ?? hh
    mesh.position.set(LANES[lane] + xDrift, y, z)
    mesh.castShadow = true
    this.scene.add(mesh)
    this.entities.push({ mesh, lane, type: 'obstacle', active: true, hw, hh, hd, animData })
  }

  private build(type: ObstacleType): { mesh: THREE.Group; hw: number; hh: number; hd: number; animData?: AnimData } {
    switch (type) {
      case 'stone':     return this.buildStone()
      case 'beast':     return this.buildBeast()
      case 'swordgate': return this.buildSwordGate()
      case 'flysword':  return this.buildFlySword()
    }
  }

  private buildStone() {
    const g = new THREE.Group()
    const hw = 1.0, hh = 1.1, hd = 0.9

    const bodyGeo = new THREE.DodecahedronGeometry(1.0, 1)
    const body = new THREE.Mesh(bodyGeo, this.mat.stone)
    body.scale.set(hw, hh, hd)
    body.castShadow = true
    g.add(body)

    const mossGeo = new THREE.SphereGeometry(0.2, 6, 4)
    const moss = new THREE.Mesh(mossGeo, this.mat.jade)
    moss.position.set(0.3, hh + 0.1, 0)
    moss.scale.y = 0.4
    g.add(moss)

    const inkLineGeo = new THREE.PlaneGeometry(hw * 1.8, 0.04)
    const inkLine = new THREE.Mesh(inkLineGeo, this.mat.ink)
    inkLine.position.set(0, 0, hd + 0.01)
    g.add(inkLine)

    return {
      mesh: g, hw, hh, hd,
      animData: { originY: hh, phase: Math.random() * Math.PI * 2, kind: 'stone-idle', parts: [] },
    }
  }

  private buildBeast() {
    const g = new THREE.Group()
    const hw = 1.3, hh = 0.5, hd = 0.3

    const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, hw * 2, 6)
    const beam = new THREE.Mesh(beamGeo, this.mat.wood)
    beam.rotation.z = Math.PI / 2
    beam.castShadow = true
    g.add(beam)

    for (let i = -3; i <= 3; i++) {
      const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, hh * 2 + 0.3, 6)
      const pole = new THREE.Mesh(poleGeo, this.mat.woodDark)
      pole.position.set(i * 0.35, 0, 0)
      g.add(pole)
    }

    for (let i = 0; i < 3; i++) {
      const leafGeo = new THREE.PlaneGeometry(0.3, 0.1)
      const leafMat = new THREE.MeshBasicMaterial({ color: 0x5a7a4a, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
      const leaf = new THREE.Mesh(leafGeo, leafMat)
      leaf.position.set((Math.random() - 0.5) * hw, hh + 0.1, 0)
      leaf.rotation.z = (Math.random() - 0.5) * 0.5
      g.add(leaf)
    }

    return { mesh: g, hw, hh, hd }
  }

  private buildSwordGate() {
    const g = new THREE.Group()
    const beamY = 1.2, pillarH = 2.0
    const hw = 1.2, hh = 0.15, hd = 0.3

    for (const x of [-hw, hw]) {
      const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, pillarH, 8)
      const pillar = new THREE.Mesh(pillarGeo, this.mat.wood)
      pillar.position.set(x, pillarH / 2 - beamY, 0)
      pillar.castShadow = true
      g.add(pillar)

      const leafGeo = new THREE.ConeGeometry(0.1, 0.25, 4)
      const leaf = new THREE.Mesh(leafGeo, this.mat.jade)
      leaf.position.set(x, pillarH - beamY + 0.15, 0)
      g.add(leaf)
    }

    for (const dy of [-0.05, 0.05]) {
      const beamGeo = new THREE.BoxGeometry(hw * 2, 0.03, 0.03)
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x2a2520 })
      const beam = new THREE.Mesh(beamGeo, beamMat)
      beam.position.y = dy
      g.add(beam)
    }

    const glowGeo = new THREE.BoxGeometry(hw * 2, 0.25, 0.25)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x3a3530, transparent: true, opacity: 0.15,
      depthWrite: false,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    g.add(glow)

    const baseGeo = new THREE.CylinderGeometry(0.03, 0.03, hw * 2, 6)
    const base = new THREE.Mesh(baseGeo, this.mat.woodDark)
    base.rotation.z = Math.PI / 2
    base.position.y = -beamY + 0.03
    g.add(base)

    return {
      mesh: g, hw, hh, hd,
      animData: { originY: beamY, phase: Math.random() * Math.PI * 2, kind: 'gate-idle', parts: [glow] },
    }
  }

  private buildFlySword() {
    const g = new THREE.Group()
    const hw = 0.7, hh = 0.5, hd = 0.7

    const bladeGeo = new THREE.BoxGeometry(0.12, 0.06, 1.1)
    const blade = new THREE.Mesh(bladeGeo, this.mat.ink)
    blade.castShadow = true
    g.add(blade)

    const edgeGeo = new THREE.BoxGeometry(0.18, 0.1, 1.2)
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x6a6560, transparent: true, opacity: 0.2,
      depthWrite: false,
    })
    const edge = new THREE.Mesh(edgeGeo, edgeMat)
    g.add(edge)

    const tipGeo = new THREE.ConeGeometry(0.06, 0.25, 4)
    const tip = new THREE.Mesh(tipGeo, this.mat.stoneDark)
    tip.rotation.x = Math.PI / 2
    tip.position.z = 0.68
    g.add(tip)

    const hiltGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6)
    const hilt = new THREE.Mesh(hiltGeo, this.mat.wood)
    hilt.rotation.x = Math.PI / 2
    hilt.position.z = -0.68
    g.add(hilt)

    const tasselGeo = new THREE.ConeGeometry(0.04, 0.2, 4)
    const tassel = new THREE.Mesh(tasselGeo, this.mat.sealRed)
    tassel.position.set(0, -0.08, -0.8)
    g.add(tassel)

    const shadowGeo = new THREE.CylinderGeometry(0.01, 0.15, 1.5, 6, 1, true)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x4a4540, transparent: true, opacity: 0.06,
      depthWrite: false, side: THREE.DoubleSide,
    })
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.position.y = -0.9
    g.add(shadow)

    return {
      mesh: g, hw, hh, hd,
      animData: { originY: 1.0, phase: Math.random() * Math.PI * 2, kind: 'sword-hover', parts: [blade, edge] },
    }
  }

  // ── 道具 ──────────────────────────────────────────────

  private spawnPowerup(z: number, lane: number, ptype: PowerupType, xDrift: number) {
    const g = new THREE.Group()

    if (ptype === 'magnet') {
      // 磁铁：U 形磁铁造型
      const bodyGeo = new THREE.TorusGeometry(0.3, 0.1, 8, 16, Math.PI)
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xcc4444, emissive: 0x661111, emissiveIntensity: 0.8,
        roughness: 0.3, metalness: 0.6,
      })
      const body = new THREE.Mesh(bodyGeo, bodyMat)
      body.rotation.x = Math.PI / 2
      g.add(body)

      // 发光圈
      const glowGeo = new THREE.SphereGeometry(0.5, 10, 10)
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff6666, transparent: true, opacity: 0.2, depthWrite: false,
      })
      g.add(new THREE.Mesh(glowGeo, glowMat))
    } else {
      // 护盾：八面体造型
      const shieldGeo = new THREE.OctahedronGeometry(0.35, 0)
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0x4488ff, emissive: 0x1144aa, emissiveIntensity: 1,
        roughness: 0.2, metalness: 0.5, transparent: true, opacity: 0.8,
      })
      g.add(new THREE.Mesh(shieldGeo, shieldMat))

      // 外圈光环
      const ringGeo = new THREE.TorusGeometry(0.45, 0.03, 8, 20)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x66aaff, transparent: true, opacity: 0.4, depthWrite: false,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2
      g.add(ring)
    }

    g.position.set(LANES[lane] + xDrift, COIN_FLOAT_Y, z)
    this.scene.add(g)
    this.entities.push({
      mesh: g, lane, type: 'powerup', active: true, hw: 0.45, hh: 0.45, hd: 0.45,
      powerupType: ptype,
      animData: { originY: COIN_FLOAT_Y, phase: Math.random() * Math.PI * 2, kind: 'powerup-bob', parts: [] },
    })
  }

  // ── 磁铁吸附 ──────────────────────────────────────────

  attractCoins(playerPos: THREE.Vector3, radius: number) {
    for (const e of this.entities) {
      if (!e.active || e.type !== 'coin') continue
      const dx = playerPos.x - e.mesh.position.x
      const dz = playerPos.z - e.mesh.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < radius && dist > 0.1) {
        const pull = 0.15 // 吸附速度
        e.mesh.position.x += dx * pull
        e.mesh.position.z += dz * pull
      }
    }
  }

  // ── 灵石 ──────────────────────────────────────────────

  private spawnCoin(z: number, lane: number, xDrift: number) {
    const g = new THREE.Group()

    const coreGeo = new THREE.OctahedronGeometry(0.28, 0)
    const core = new THREE.Mesh(coreGeo, this.mat.coin)
    g.add(core)

    const glowGeo = new THREE.SphereGeometry(0.38, 10, 10)
    const glow = new THREE.Mesh(glowGeo, this.mat.coinGlow)
    g.add(glow)

    const ringGeo = new THREE.TorusGeometry(0.42, 0.018, 8, 20)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x7aaa8a, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    g.add(ring)

    g.position.set(LANES[lane] + xDrift, COIN_FLOAT_Y, z)
    this.scene.add(g)
    this.entities.push({
      mesh: g, lane, type: 'coin', active: true, hw: 0.42, hh: 0.42, hd: 0.42,
      animData: { originY: COIN_FLOAT_Y, phase: Math.random() * Math.PI * 2, kind: 'coin-bob', parts: [ring] },
    })
  }

  // ── 动画 ──────────────────────────────────────────────

  private tickAnimation(e: GameEntity, now: number) {
    const ad = e.animData!
    const t = now + ad.phase

    switch (ad.kind) {
      case 'coin-bob': {
        e.mesh.position.y = ad.originY + Math.sin(t * 2.5) * 0.12
        e.mesh.rotation.y = t * 2
        if (ad.parts?.[0]) ad.parts[0].rotation.z = t * 1.5
        break
      }
      case 'sword-hover': {
        e.mesh.position.y = ad.originY + Math.sin(t * 3) * 0.1
        e.mesh.rotation.z = Math.sin(t * 2) * 0.05
        e.mesh.rotation.y = Math.sin(t * 1.2) * 0.08
        break
      }
      case 'gate-idle': {
        const glow = ad.parts?.[0]
        if (glow instanceof THREE.Mesh) {
          const m = glow.material as THREE.MeshBasicMaterial
          m.opacity = 0.1 + Math.sin(t * 2) * 0.05
        }
        break
      }
      case 'stone-idle':
        break
      case 'powerup-bob': {
        e.mesh.position.y = ad.originY + Math.sin(t * 3) * 0.15
        e.mesh.rotation.y = t * 2.5
        break
      }
    }
  }

  private despawn(e: GameEntity) {
    e.active = false
    this.scene.remove(e.mesh)
    e.mesh.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
      }
    })
  }
}
