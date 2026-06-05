import * as THREE from 'three'
import { GameScene } from '../scenes/GameScene'
import { Player } from '../player/Player'
import { ObstacleManager } from '../obstacles/ObstacleManager'
import { InputSystem } from './InputSystem'
import type { InputAction } from './InputSystem'
import { checkCollision } from './CollisionSystem'
import { useGameStore } from '../store/gameStore'
import { INITIAL_SPEED, MAX_SPEED, SPEED_INCREMENT, DISTANCE_SCALE } from '../utils/constants'
import { MAP_BY_ID, DEFAULT_MAP_ID } from '../maps/MapConfig'
import type { MapConfig } from '../maps/MapConfig'
import { ForkSystem } from './ForkSystem'
import { ForkRenderer } from '../scenes/ForkRenderer'

export class GameEngine {
  private gameScene: GameScene
  private player: Player
  private obstacleManager: ObstacleManager
  private inputSystem: InputSystem
  private forkSystem: ForkSystem
  private forkRenderer: ForkRenderer
  private mapConfig: MapConfig

  private clock = new THREE.Clock(false)
  private rafId = 0
  private speed = INITIAL_SPEED
  private running = false
  private playerZ = 0
  private invincibleTimer = 0
  private slowMoTimer = 0          // 死亡慢动作计时
  private slowMoScale = 1          // 时间缩放（1=正常，<1=慢动作）

  constructor(canvas: HTMLCanvasElement, mapId?: string) {
    this.mapConfig = MAP_BY_ID[mapId ?? DEFAULT_MAP_ID] ?? MAP_BY_ID[DEFAULT_MAP_ID]
    this.gameScene = new GameScene(canvas, this.mapConfig)
    this.player = new Player(this.gameScene.scene)
    this.obstacleManager = new ObstacleManager(this.gameScene.scene, 0, this.mapConfig)
    this.forkSystem = new ForkSystem()
    this.forkRenderer = new ForkRenderer(this.gameScene.scene)
    this.inputSystem = new InputSystem(this.handleInput.bind(this))
    this.tick = this.tick.bind(this)
  }

  applyMap(mapId: string) {
    this.mapConfig = MAP_BY_ID[mapId] ?? MAP_BY_ID[DEFAULT_MAP_ID]
    this.gameScene.applyMap(this.mapConfig)
    this.obstacleManager.applyMap(this.mapConfig)
  }

  start() {
    if (this.running) {
      this.running = false
      cancelAnimationFrame(this.rafId)
      this.clock.stop()
    }

    // 重新应用地图（确保视觉切换）
    const store = useGameStore.getState()
    this.applyMap(store.selectedMapId)

    this.player.reset()
    this.playerZ = 0
    this.obstacleManager.reset(0)
    this.forkSystem.reset()
    this.forkRenderer.clear()
    this.speed = INITIAL_SPEED * this.mapConfig.speedMultiplier
    this.invincibleTimer = 0
    this.clock.start()
    this.running = true
    this.rafId = requestAnimationFrame(this.tick)
  }

  private tick() {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.tick)

    const delta = Math.min(this.clock.getDelta(), 0.05)
    const store = useGameStore.getState()

    // 死亡慢动作
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= delta
      this.slowMoScale = Math.max(0.15, this.slowMoTimer / 0.6)
      if (this.slowMoTimer <= 0) {
        this.slowMoScale = 1
        this.running = false
        this.clock.stop()
        store.setPhase('dead')
        return
      }
    }
    const dt = delta * this.slowMoScale

    // 无敌倒计时
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt
      if (this.invincibleTimer <= 0) {
        store.setInvincible(false)
        this.player.setGlow(false)
      }
    }

    // 连击 / 里程碑 / 道具 tick
    store.tickComboTimer(dt)
    store.tickMilestoneTimer(dt)
    store.tickPowerups(dt)

    this.speed = Math.min(this.speed + SPEED_INCREMENT * this.mapConfig.speedMultiplier * dt, MAX_SPEED * this.mapConfig.speedMultiplier)

    this.playerZ += this.speed * dt
    this.player.mesh.position.z = this.playerZ

    // 岔路系统
    const xDrift = this.forkSystem.tick(this.playerZ, delta)
    store.setForkActive(this.forkSystem.isActive)

    // 决策区内拦截左右输入
    if (this.forkSystem.isActive) {
      // 玩家在左道 → 选左，在右道 → 选右，中间待定
      const lane = this.player.laneIndex
      if (lane === 0) this.forkSystem.chooseLeft()
      else if (lane === 2) this.forkSystem.chooseRight()
    }
    // 通过岔路点且未选择 → 默认随机
    if (this.forkSystem.needsDefault) {
      this.forkSystem.chooseDefault()
    }

    // 岔路渲染
    this.forkRenderer.update(this.playerZ, xDrift, this.forkSystem)

    // 相机跟随（带漂移平滑过渡）
    const speedRatio = (this.speed - INITIAL_SPEED * this.mapConfig.speedMultiplier) /
                       (MAX_SPEED * this.mapConfig.speedMultiplier - INITIAL_SPEED * this.mapConfig.speedMultiplier)
    const camY = 7 - speedRatio * 1.5
    const camZ = this.playerZ - 13 - speedRatio * 2

    // 摄像机 X 跟随漂移，幅度缩小保持画面稳定
    const camX = xDrift * 0.15

    this.gameScene.camera.position.set(camX, camY, camZ)
    this.gameScene.camera.lookAt(xDrift * 0.25, 0.5, this.playerZ + 22)

    this.gameScene.updateFloor(this.playerZ, xDrift)
    this.gameScene.updateEnvDrift(xDrift)
    this.gameScene.updateParticles(this.playerZ, dt)
    this.gameScene.updateSpeedLines(this.playerZ, this.speed, dt)

    this.player.update(dt)
    this.obstacleManager.update(this.playerZ, this.speed, xDrift)

    // 碰撞检测
    for (const entity of this.obstacleManager.getActiveEntities()) {
      if (!checkCollision(this.player, entity)) continue

      if (entity.type === 'coin') {
        this.obstacleManager.removeEntity(entity)
        store.addCoin()
        // 连击加成：combo 1 无加成，combo 2+ 额外 +5 每级
        const combo = store.combo
        if (combo > 1) {
          store.addScore((combo - 1) * 5)
        }
      } else if (entity.type === 'powerup') {
        this.obstacleManager.removeEntity(entity)
        const ptype = entity.powerupType
        if (ptype === 'magnet') {
          store.activateMagnet()
        } else if (ptype === 'shield') {
          store.activateShieldPickup()
          this.player.setGlow(true)
        }
      } else {
        if (store.invincible) {
          this.obstacleManager.removeEntity(entity)
          continue
        }
        this.die()
        return
      }
    }

    // 磁铁吸附灵石
    if (store.magnetTimer > 0) {
      this.obstacleManager.attractCoins(this.player.mesh.position, 8)
    }

    // 修为 + 连击倍率 + 里程碑检测
    const comboMultiplier = 1 + Math.max(0, store.combo - 1) * 0.1
    store.addScore(this.speed * dt * DISTANCE_SCALE * store.getScoreMultiplier() * comboMultiplier)
    store.checkMilestone(Math.floor(store.score))
    store.setSpeed(this.speed)
    store.setJumpsLeft(this.player.jumps)

    this.gameScene.render()
  }

  private die() {
    const store = useGameStore.getState()
    const hasLife = store.loseLife()

    if (hasLife) {
      this.player.respawn()
      this.invincibleTimer = store.getShieldDuration()
      store.setInvincible(true)
      this.player.setGlow(true)
      this.obstacleManager.clearNearby(this.playerZ, 15)
    } else {
      // 死亡慢动作：0.6 秒减速后再弹结算
      this.running = true // 保持 tick 运行以驱动慢动作
      this.player.die()
      this.slowMoTimer = 0.6
      this.slowMoScale = 1
      store.resetCombo()
    }
  }

  private handleInput(action: InputAction) {
    const store = useGameStore.getState()
    const phase = store.phase

    if (action === 'start') {
      if (phase === 'menu' || phase === 'dead') {
        store.reset()
        store.setPhase('playing')
      }
      return
    }

    if (action === 'pause') {
      if (phase !== 'playing') return
      if (store.paused) {
        this.resume()
      } else {
        this.pause()
      }
      return
    }

    if (phase !== 'playing' || store.paused) return

    // 岔路决策区内：左右输入用于选择路径
    if (action === 'left' && this.forkSystem.isActive) {
      this.forkSystem.chooseLeft()
      this.player.moveLeft()
      return
    }
    if (action === 'right' && this.forkSystem.isActive) {
      this.forkSystem.chooseRight()
      this.player.moveRight()
      return
    }

    switch (action) {
      case 'left':  this.player.moveLeft();  break
      case 'right': this.player.moveRight(); break
      case 'jump':  this.player.jump();      break
      case 'slide': this.player.slide();     break
      case 'duck':  this.player.duck();      break
    }
  }

  pause() {
    if (!this.running) return
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.clock.stop()
    useGameStore.getState().setPaused(true)
  }

  resume() {
    if (this.running) return
    this.running = true
    this.clock.start()
    useGameStore.getState().setPaused(false)
    this.rafId = requestAnimationFrame(this.tick)
  }

  returnToLobby() {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.clock.stop()
    this.forkRenderer.clear()
    useGameStore.getState().settleAndReturn()
  }

  dispose() {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.clock.stop()
    this.inputSystem.dispose()
    this.forkRenderer.clear()
    this.gameScene.dispose()
  }
}
