import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import gsap from 'gsap'
import { useGameStore } from '../store/gameStore'
import {
  LANES, GROUND_Y, PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_DEPTH,
  JUMP_VELOCITY, GRAVITY, SLIDE_HEIGHT, SLIDE_DURATION, LANE_SWITCH_DURATION,
} from '../utils/constants'

export type PlayerState = 'running' | 'jumping' | 'sliding' | 'dead'

// 骨骼引用
interface BoneRef {
  bone: THREE.Bone
  restQuat: THREE.Quaternion
  restPos: THREE.Vector3
}

export class Player {
  mesh: THREE.Group
  state: PlayerState = 'running'

  laneIndex = 1
  private targetLaneIndex = 1

  private posY = GROUND_Y
  private velY = 0
  private slideTimer = 0
  private switchTween: gsap.core.Tween | null = null

  hbWidth = PLAYER_WIDTH
  hbHeight = PLAYER_HEIGHT
  hbDepth = PLAYER_DEPTH

  private jumpsLeft = 2

  // 模型
  private model: THREE.Group | null = null
  private placeholder: THREE.Mesh | null = null

  // 骨骼
  private bones: Record<string, BoneRef> = {}
  private hasSkeleton = false

  // GLB 动画
  private mixer: THREE.AnimationMixer | null = null
  private glbClips: Record<string, THREE.AnimationClip> = {}
  private glbActions: Record<string, THREE.AnimationAction> = {}
  private currentGlbClip = ''
  private hasGlbAnim = false

  // 动画时间
  private animTime = 0
  private landingTimer = 0

  // 模型 rest position（group 级动画用）
  private modelRestY = 0

  // 灵气粒子系统
  private particles: THREE.Points | null = null
  private particlePositions: Float32Array | null = null
  private particleVelocities: Float32Array | null = null
  private particleLifetimes: Float32Array | null = null
  private particleMaxLifetime = 1.0

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group()
    this.buildPlaceholder()
    scene.add(this.mesh)
    this.mesh.position.set(LANES[1], GROUND_Y, 0)
    this.loadModel()
    this.createParticleSystem()
  }

  // ── Placeholder ─────────────────────────────────────────

  private buildPlaceholder() {
    const geo = new THREE.CapsuleGeometry(0.4, 0.9, 4, 8)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ccff, emissive: 0x003366, emissiveIntensity: 1.5,
      transparent: true, opacity: 0.6,
    })
    this.placeholder = new THREE.Mesh(geo, mat)
    this.placeholder.position.y = PLAYER_HEIGHT / 2
    this.placeholder.castShadow = true
    this.mesh.add(this.placeholder)
  }

  // ── 模型加载 ────────────────────────────────────────────

  private loadModel() {
    const loader = new GLTFLoader()
    loader.load(
      '/model_with_legs.glb',
      (gltf) => {
        if (this.placeholder) {
          this.mesh.remove(this.placeholder)
          this.placeholder = null
        }

        const model = gltf.scene as THREE.Group
        this.model = model

        // 自动缩放
        const box = new THREE.Box3().setFromObject(model)
        const size = new THREE.Vector3()
        box.getSize(size)
        const scale = PLAYER_HEIGHT / size.y
        model.scale.setScalar(scale)

        // 底部对齐
        const newBox = new THREE.Box3().setFromObject(model)
        model.position.y = -newBox.min.y
        this.modelRestY = model.position.y

        // 赛博朋克材质
        model.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true
            const mesh = child as THREE.Mesh
            if (Array.isArray(mesh.material)) {
              mesh.material = mesh.material.map(m => this.cyberpunkMat(m))
            } else {
              mesh.material = this.cyberpunkMat(mesh.material)
            }
          }
        })

        this.mesh.add(model)

        // 打印模型结构（调试）
        console.group('[Player] model structure')
        model.traverse(c => {
          const tags = []
          if ((c as THREE.Bone).isBone) tags.push('BONE')
          if ((c as THREE.SkinnedMesh).isSkinnedMesh) tags.push('SKINNED_MESH')
          if (tags.length) console.log(c.name, '→', tags.join(', '))
        })
        console.groupEnd()

        // 探测骨骼
        this.detectBones(model)

        // GLB 动画
        if (gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(model)
          gltf.animations.forEach(clip => {
            const key = clip.name.toLowerCase()
            this.glbClips[key] = clip
            this.glbActions[key] = this.mixer!.clipAction(clip)
          })
          this.hasGlbAnim = true
          console.log('[Player] GLB animations found:', gltf.animations.map(a => a.name))

          // 播放第一个动画（通常是 idle/run/walk）
          this.playGlbClip(this.findGlbClip(['run', 'walk', 'idle', 'default', 'anim']) ?? gltf.animations[0].name.toLowerCase())
        } else {
          console.log('[Player] no GLB animations, using procedural')
        }

        this.addGlowRing()
      },
      undefined,
      (err) => console.error('[Player] GLTF load error', err),
    )
  }

  // ── 骨骼探测 ────────────────────────────────────────────

  private detectBones(root: THREE.Object3D) {
    const boneMap: Record<string, BoneRef> = {}

    const bonePatterns: Record<string, string[]> = {
      'hip':    ['hip', 'pelvis', 'root', 'torso_lower', 'hips'],
      'spine':  ['spine', 'back', 'chest', 'torso', 'upper_body', 'spine1', 'spine2'],
      'head':   ['head', 'neck', 'skull'],
      'thighL': ['thigh_l', 'left_thigh', 'upper_leg_l', 'leftupleg', 'leg_l_upper', 'femur_l'],
      'shinL':  ['shin_l', 'left_shin', 'lower_leg_l', 'leftleg', 'leg_l_lower', 'tibia_l', 'calf_l'],
      'footL':  ['foot_l', 'left_foot', 'toe_l', 'lefttoe', 'ankle_l'],
      'thighR': ['thigh_r', 'right_thigh', 'upper_leg_r', 'rightupleg', 'leg_r_upper', 'femur_r'],
      'shinR':  ['shin_r', 'right_shin', 'lower_leg_r', 'rightleg', 'leg_r_lower', 'tibia_r', 'calf_r'],
      'footR':  ['foot_r', 'right_foot', 'toe_r', 'righttoe', 'ankle_r'],
      'armL':   ['arm_l', 'left_arm', 'upper_arm_l', 'leftarm', 'shoulder_l', 'forearm_l'],
      'armR':   ['arm_r', 'right_arm', 'upper_arm_r', 'rightarm', 'shoulder_r', 'forearm_r'],
      'handL':  ['hand_l', 'left_hand', 'lefthand', 'wrist_l'],
      'handR':  ['hand_r', 'right_hand', 'righthand', 'wrist_r'],
    }

    root.traverse(child => {
      if (!(child as THREE.Bone).isBone) return
      const bone = child as THREE.Bone
      const nameLower = bone.name.toLowerCase().replace(/[\s\-\.]/g, '_')

      for (const [key, patterns] of Object.entries(bonePatterns)) {
        if (boneMap[key]) continue
        for (const pat of patterns) {
          if (nameLower.includes(pat)) {
            boneMap[key] = {
              bone,
              restQuat: bone.quaternion.clone(),
              restPos: bone.position.clone(),
            }
            break
          }
        }
      }
    })

    const foundKeys = Object.keys(boneMap)
    if (foundKeys.length >= 2) {
      this.bones = boneMap
      this.hasSkeleton = true
      console.log('[Player] bones detected:', foundKeys)
    } else {
      console.log('[Player] not enough bones for procedural anim, relying on GLB clips or group-level')
    }
  }

  // ── 材质（修仙风格）─────────────────────────────────────

  private cyberpunkMat(original: THREE.Material): THREE.Material {
    const origColor = (original as THREE.MeshStandardMaterial).color
    // 修仙风格：玉石质感 + 灵光效果
    return new THREE.MeshStandardMaterial({
      color: origColor ?? new THREE.Color(0xe8f4e8),  // 淡青玉色
      emissive: new THREE.Color(0x2a5a3a),  // 深绿色灵光
      emissiveIntensity: 0.6,
      roughness: 0.25,  // 更光滑的玉石质感
      metalness: 0.4,   // 适度的金属感
      fog: false,
    })
  }

  // ── GLB 动画工具 ────────────────────────────────────────

  private findGlbClip(names: string[]): string | undefined {
    for (const n of names) {
      for (const key of Object.keys(this.glbActions)) {
        if (key.includes(n)) return key
      }
    }
    return undefined
  }

  private playGlbClip(name: string | undefined) {
    if (!name || !this.glbActions[name] || this.currentGlbClip === name) return
    const prev = this.glbActions[this.currentGlbClip]
    const next = this.glbActions[name]
    if (prev) prev.fadeOut(0.3)
    next.reset().fadeIn(0.3).play()
    this.currentGlbClip = name
  }

  // ── 灵气光圈（修仙风格）───────────────────────────────────

  private addGlowRing() {
    const geo = new THREE.RingGeometry(0.5, 0.65, 32)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x88ff88, transparent: true, opacity: 0.5, side: THREE.DoubleSide,  // 灵气绿光
    })
    const ring = new THREE.Mesh(geo, mat)
    ring.position.y = 0.02
    this.mesh.add(ring)

    // 添加外层光晕
    const glowGeo = new THREE.RingGeometry(0.65, 0.85, 32)
    glowGeo.rotateX(-Math.PI / 2)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xaaffaa, transparent: true, opacity: 0.2, side: THREE.DoubleSide,
    })
    const glowRing = new THREE.Mesh(glowGeo, glowMat)
    glowRing.position.y = 0.01
    this.mesh.add(glowRing)

    const animate = () => {
      if (this.state === 'dead') return
      const t = performance.now() * 0.001
      ring.material.opacity = 0.3 + Math.sin(t * 2) * 0.15
      glowRing.material.opacity = 0.15 + Math.sin(t * 1.5 + 0.5) * 0.1
      ring.rotation.z = t * 0.3
      glowRing.rotation.z = -t * 0.2
      requestAnimationFrame(animate)
    }
    animate()
  }

  // ── 灵气粒子系统 ─────────────────────────────────────────

  private createParticleSystem() {
    const particleCount = 50
    const geometry = new THREE.BufferGeometry()

    this.particlePositions = new Float32Array(particleCount * 3)
    this.particleVelocities = new Float32Array(particleCount * 3)
    this.particleLifetimes = new Float32Array(particleCount)

    // 初始化粒子位置和生命周期
    for (let i = 0; i < particleCount; i++) {
      this.resetParticle(i)
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3))

    const material = new THREE.PointsMaterial({
      color: 0x88ff88,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.particles = new THREE.Points(geometry, material)
    this.mesh.add(this.particles)
  }

  private resetParticle(index: number) {
    if (!this.particlePositions || !this.particleVelocities || !this.particleLifetimes) return

    const i3 = index * 3
    // 在角色周围随机位置生成
    this.particlePositions[i3] = (Math.random() - 0.5) * 0.8
    this.particlePositions[i3 + 1] = Math.random() * 0.5
    this.particlePositions[i3 + 2] = (Math.random() - 0.5) * 0.8

    // 向上飘动的速度
    this.particleVelocities[i3] = (Math.random() - 0.5) * 0.3
    this.particleVelocities[i3 + 1] = 0.5 + Math.random() * 0.5
    this.particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.3

    // 随机生命周期
    this.particleLifetimes[index] = Math.random() * this.particleMaxLifetime
  }

  private updateParticles(delta: number) {
    if (!this.particles || !this.particlePositions || !this.particleVelocities || !this.particleLifetimes) return

    const positions = this.particlePositions
    const velocities = this.particleVelocities
    const lifetimes = this.particleLifetimes

    for (let i = 0; i < lifetimes.length; i++) {
      lifetimes[i] -= delta

      if (lifetimes[i] <= 0) {
        this.resetParticle(i)
        continue
      }

      const i3 = i * 3
      positions[i3] += velocities[i3] * delta
      positions[i3 + 1] += velocities[i3 + 1] * delta
      positions[i3 + 2] += velocities[i3 + 2] * delta

      // 添加轻微的漂浮效果
      positions[i3] += Math.sin(performance.now() * 0.001 + i) * 0.01
    }

    this.particles.geometry.attributes.position.needsUpdate = true

    // 根据状态调整粒子效果
    const material = this.particles.material as THREE.PointsMaterial
    if (this.state === 'running') {
      material.opacity = 0.6
      material.size = 0.08
    } else if (this.state === 'jumping') {
      material.opacity = 0.8
      material.size = 0.1
    } else if (this.state === 'sliding') {
      material.opacity = 0.4
      material.size = 0.06
    }
  }

  // ── 公开属性 ─────────────────────────────────────────────

  get worldX() { return this.mesh.position.x }
  get worldY() { return this.posY }
  get worldZ() { return this.mesh.position.z }
  get jumps() { return this.jumpsLeft }

  // ── 操作 ─────────────────────────────────────────────────

  jump() {
    if (this.state === 'dead') return
    if (this.state === 'sliding') this.endSlide()
    if (this.jumpsLeft <= 0) return

    this.jumpsLeft--
    this.state = 'jumping'
    this.velY = this.jumpsLeft === 1 ? JUMP_VELOCITY : JUMP_VELOCITY * 0.8

    if (this.jumpsLeft === 0) this.triggerDoubleJumpFX()

    // 优先 GLB 动画
    const clip = this.findGlbClip(['jump', 'leap', 'air', 'fall'])
    if (clip) this.playGlbClip(clip)
  }

  private triggerDoubleJumpFX() {
    gsap.fromTo(this.mesh.scale,
      { x: 1.3, y: 0.8, z: 1.3 },
      { x: 1, y: 1, z: 1, duration: 0.25, ease: 'back.out(2)' },
    )
  }

  slide() {
    if (this.state === 'sliding') return
    if (this.state === 'jumping') {
      this.posY = GROUND_Y
      this.velY = 0
      this.jumpsLeft = 2
      this.mesh.position.y = GROUND_Y
      this.mesh.scale.set(1, 1, 1)
    }
    this.state = 'sliding'
    this.slideTimer = SLIDE_DURATION
    this.hbHeight = SLIDE_HEIGHT

    // 下蹲动画：压缩 + 前倾
    if (this.model) {
      gsap.to(this.model.scale, { y: 0.55, x: 1.1, z: 1.1, duration: 0.15, ease: 'power3.out' })
      gsap.to(this.model.position, { y: this.modelRestY - 0.25, duration: 0.15, ease: 'power3.out' })
      gsap.to(this.model.rotation, { x: 0.3, duration: 0.15, ease: 'power3.out' })
    }

    const clip = this.findGlbClip(['slide', 'crouch', 'duck', 'roll'])
    if (clip) this.playGlbClip(clip)
  }

  moveLeft() {
    if (this.targetLaneIndex <= 0) return
    this.targetLaneIndex--
    this.switchLane()
  }

  moveRight() {
    if (this.targetLaneIndex >= 2) return
    this.targetLaneIndex++
    this.switchLane()
  }

  private switchLane() {
    this.laneIndex = this.targetLaneIndex
    if (this.switchTween) this.switchTween.kill()

    const tiltDir = this.targetLaneIndex > this.laneIndex ? -1 : 1
    gsap.to(this.mesh.rotation, { z: tiltDir * 0.2, duration: LANE_SWITCH_DURATION * 0.5, ease: 'power2.out' })
    gsap.to(this.mesh.rotation, { z: 0, duration: LANE_SWITCH_DURATION * 0.5, ease: 'power2.in', delay: LANE_SWITCH_DURATION * 0.5 })

    this.switchTween = gsap.to(this.mesh.position, {
      x: LANES[this.targetLaneIndex],
      duration: LANE_SWITCH_DURATION,
      ease: 'power2.out',
    })
  }

  // ── 主循环 ───────────────────────────────────────────────

  update(delta: number) {
    if (this.state === 'dead') return

    this.animTime += delta

    // GLB 内置动画 mixer
    if (this.mixer) this.mixer.update(delta)

    // 落地缓冲
    if (this.landingTimer > 0) this.landingTimer -= delta

    // 重力 & 跳跃
    if (this.state === 'jumping') {
      this.velY += GRAVITY * delta
      this.posY += this.velY * delta
      if (this.posY <= GROUND_Y) {
        this.posY = GROUND_Y
        this.velY = 0
        this.state = 'running'
        this.jumpsLeft = 2
        this.landingTimer = 0.15
        this.mesh.scale.set(1, 1, 1)
        // 切回跑步动画
        this.switchToRun()
      }
      this.mesh.position.y = this.posY
    }

    // 滑铲计时
    if (this.state === 'sliding') {
      this.slideTimer -= delta
      if (this.slideTimer <= 0) this.endSlide()
    }

    // 补充动画（骨骼/group 级，叠加在 GLB 动画之上）
    if (this.hasGlbAnim) {
      // GLB 动画已驱动，只做微调
      this.applyGlbOverlay()
    } else if (this.hasSkeleton) {
      this.applySkeletonAnim()
    } else {
      this.applyGroupAnim()
    }

    // 更新灵气粒子
    this.updateParticles(delta)
  }

  // ── GLB 动画叠加层（微调） ──────────────────────────────

  private applyGlbOverlay() {
    if (!this.model) return

    const t = this.animTime * 12

    // 跑步时身体轻微弹跳（滑铲/跳跃时不干预，由 gsap 控制）
    if (this.state === 'running') {
      const bob = Math.abs(Math.sin(t * 2)) * 0.025 + Math.sin(t * 4) * 0.005
      this.model.position.y = this.modelRestY + bob
      this.model.scale.set(1, 1, 1)
      this.model.rotation.x = 0
    }

    // 落地 squash（更平滑的过渡）
    if (this.landingTimer > 0 && this.state === 'running') {
      const s = (this.landingTimer / 0.15) * 0.1
      this.model.scale.set(1 + s * 0.25, 1 - s, 1 + s * 0.25)
    }
  }

  // ── 程序化骨骼动画（无 GLB 动画时） ────────────────────

  private applySkeletonAnim() {
    const t = this.animTime * 12

    // 落地 squash
    let squash = 0
    if (this.landingTimer > 0) squash = (this.landingTimer / 0.15) * 0.3

    // ── 髋部 ──
    const hip = this.bones.hip
    if (hip && this.state === 'running') {
      const bob = Math.sin(t * 2) * 0.04
      hip.bone.position.y = hip.restPos.y + bob
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.06)
      hip.bone.quaternion.slerpQuaternions(hip.restQuat, q, 0.5)
    }

    // ── 左腿 ──
    this.animateLeg('L', t, 1)
    // ── 右腿 ──
    this.animateLeg('R', t, -1)
    // ── 左臂 ──
    this.animateArm('L', t, 1)
    // ── 右臂 ──
    this.animateArm('R', t, -1)

    // squash
    if (squash > 0 && hip) {
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), squash)
      hip.bone.quaternion.slerp(q, squash)
    }
  }

  private animateLeg(side: 'L' | 'R', t: number, phase: number) {
    const thigh = this.bones[`thigh${side}`]
    const shin = this.bones[`shin${side}`]
    const foot = this.bones[`foot${side}`]

    if (this.state === 'running') {
      // ── 跑步（更自然的运动曲线）──
      if (thigh) {
        // 使用更平滑的正弦曲线，添加二次谐波让运动更自然
        const swing = Math.sin(t + phase * Math.PI) * 0.65 + Math.sin(t * 2 + phase * Math.PI) * 0.08
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), swing)
        thigh.bone.quaternion.slerpQuaternions(thigh.restQuat, q, 0.85)
      }
      if (shin) {
        // 小腿：更自然的弯曲 timing，前摆时略微弯曲
        const knee = Math.sin(t + phase * Math.PI + 0.3)
        const kneeAngle = Math.max(0, knee) * 0.6 + 0.05  // 添加基础弯曲
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), kneeAngle)
        shin.bone.quaternion.slerpQuaternions(shin.restQuat, q, 0.75)
      }
      if (foot) {
        // 脚踝：更自然的滚动效果
        const footPhase = t + phase * Math.PI
        const footAngle = Math.sin(footPhase) * 0.15 + Math.max(0, Math.sin(footPhase + 0.5)) * 0.1
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), footAngle)
        foot.bone.quaternion.slerpQuaternions(foot.restQuat, q, 0.5)
      }
    } else if (this.state === 'jumping') {
      // ── 跳跃：收腿（更自然的蜷缩）──
      if (thigh) {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.6)
        thigh.bone.quaternion.slerp(q, 0.65)
      }
      if (shin) {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.7)
        shin.bone.quaternion.slerp(q, 0.55)
      }
      if (foot) {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.2)
        foot.bone.quaternion.slerp(q, 0.4)
      }
    } else if (this.state === 'sliding') {
      // ── 滑铲：腿前伸 ──
      if (thigh) {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.9)
        thigh.bone.quaternion.slerp(q, 0.85)
      }
      if (shin) {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.15)
        shin.bone.quaternion.slerp(q, 0.6)
      }
    }
  }

  private animateArm(side: 'L' | 'R', t: number, phase: number) {
    const arm = this.bones[`arm${side}`]
    const hand = this.bones[`hand${side}`]

    if (this.state === 'running') {
      if (arm) {
        // 手臂与腿反向摆动，添加自然的相位偏移
        const swing = Math.sin(t + phase * Math.PI) * 0.45 + Math.sin(t * 2 + phase * Math.PI) * 0.05
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -swing)
        arm.bone.quaternion.slerpQuaternions(arm.restQuat, q, 0.75)
      }
      if (hand) {
        // 手腕自然摆动
        const handSwing = Math.sin(t + phase * Math.PI + 0.2) * 0.1
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), handSwing)
        hand.bone.quaternion.slerpQuaternions(hand.restQuat, q, 0.4)
      }
    } else if (this.state === 'jumping') {
      if (arm) {
        // 跳跃时手臂自然张开
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.4)
        arm.bone.quaternion.slerp(q, 0.55)
      }
      if (hand) {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.1)
        hand.bone.quaternion.slerp(q, 0.4)
      }
    } else if (this.state === 'sliding') {
      if (arm) {
        // 滑铲时手臂向后
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.35)
        arm.bone.quaternion.slerp(q, 0.55)
      }
    }
  }

  // ── Group 级兜底动画（无骨骼无 GLB 动画时） ─────────────

  private applyGroupAnim() {
    if (!this.model) return
    const t = this.animTime * 12

    if (this.state === 'running') {
      // 更自然的跑步动画
      const phase = t * 2

      // 上下弹跳（更平滑的曲线）
      const bob = Math.abs(Math.sin(phase)) * 0.06 + Math.sin(phase * 2) * 0.01
      this.model.position.y = this.modelRestY + bob

      // 前倾（更自然的摆动）
      this.model.rotation.x = Math.sin(phase) * 0.06 + 0.04

      // 左右微摆（模拟换脚，更明显的节奏）
      this.model.rotation.z = Math.sin(phase * 0.5) * 0.05 + Math.sin(phase * 1.5) * 0.01

      // 轻微 scale 呼吸（更自然）
      const breath = Math.sin(phase) * 0.015 + Math.sin(phase * 2) * 0.005
      this.model.scale.set(1, 1 + breath, 1)

      // 添加轻微的前后摆动（模拟跑步惯性）
      this.model.position.z = Math.sin(phase * 0.5) * 0.01
    }

    if (this.state === 'jumping') {
      // 跳跃时身体前倾 + 微收（更平滑的过渡）
      this.model.rotation.x = THREE.MathUtils.lerp(this.model.rotation.x, -0.2, 0.1)
      this.model.scale.y = THREE.MathUtils.lerp(this.model.scale.y, 0.95, 0.08)
      this.model.scale.x = THREE.MathUtils.lerp(this.model.scale.x, 1.02, 0.08)
      this.model.scale.z = THREE.MathUtils.lerp(this.model.scale.z, 1.02, 0.08)
    }

    // 落地 squash/stretch（仅跑步时）
    if (this.landingTimer > 0 && this.state === 'running') {
      const s = (this.landingTimer / 0.15) * 0.15
      this.model.scale.set(1 + s * 0.3, 1 - s, 1 + s * 0.3)
    }
    // 滑铲时由 gsap 控制，不干预
  }

  // ── 状态切换 ────────────────────────────────────────────

  private switchToRun() {
    const clip = this.findGlbClip(['run', 'walk', 'idle', 'default', 'anim'])
    if (clip) this.playGlbClip(clip)
  }

  private endSlide() {
    this.state = 'running'
    this.hbHeight = PLAYER_HEIGHT

    // 恢复下蹲前的模型状态
    if (this.model) {
      gsap.to(this.model.scale, { x: 1, y: 1, z: 1, duration: 0.2, ease: 'back.out(1.5)' })
      gsap.to(this.model.position, { y: this.modelRestY, duration: 0.2, ease: 'power2.out' })
      gsap.to(this.model.rotation, { x: 0, duration: 0.2, ease: 'power2.out' })
    }

    this.switchToRun()
  }

  die() {
    if (this.state === 'dead') return
    this.state = 'dead'

    const clip = this.findGlbClip(['die', 'death', 'fall', 'hit'])
    if (clip) this.playGlbClip(clip)

    gsap.to(this.mesh.rotation, { x: -Math.PI / 2, duration: 0.5, ease: 'power2.in' })
    gsap.to(this.mesh.position, { y: -2, duration: 0.5, ease: 'power2.in', delay: 0.3 })
  }

  /** 复活（不重置位置，原地恢复） */
  respawn() {
    this.state = 'running'
    this.velY = 0
    this.posY = GROUND_Y
    this.jumpsLeft = useGameStore.getState().getMaxJumps()
    this.slideTimer = 0
    this.landingTimer = 0
    this.hbHeight = PLAYER_HEIGHT
    this.hbWidth = PLAYER_WIDTH
    this.hbDepth = PLAYER_DEPTH

    this.mesh.visible = true
    this.mesh.position.y = GROUND_Y
    this.mesh.rotation.set(0, 0, 0)
    this.mesh.scale.set(1, 1, 1)

    if (this.hasSkeleton) {
      for (const ref of Object.values(this.bones)) {
        ref.bone.quaternion.copy(ref.restQuat)
        ref.bone.position.copy(ref.restPos)
      }
    }
    if (this.model) {
      this.model.rotation.set(0, 0, 0)
      this.model.scale.set(1, 1, 1)
      this.model.position.y = this.modelRestY
    }

    this.switchToRun()
  }

  /** 无敌闪烁（金光护体） */
  setGlow(on: boolean) {
    if (!this.model) return
    if (on) {
      // 金光护体效果
      this.model.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
          if (mat.emissive) {
            mat.emissive.set(0xffd700)  // 金色
            mat.emissiveIntensity = 2.0
          }
        }
      })
      const flash = () => {
        const store = useGameStore.getState()
        if (!store.invincible) {
          this.mesh.visible = true
          this.model?.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
              if (mat.emissive) {
                mat.emissive.set(0x2a5a3a)  // 恢复灵光色
                mat.emissiveIntensity = 0.6
              }
            }
          })
          return
        }
        this.mesh.visible = !this.mesh.visible
        setTimeout(flash, 120)
      }
      this.mesh.visible = true
      flash()
    }
  }

  reset() {
    this.state = 'running'
    this.laneIndex = 1
    this.targetLaneIndex = 1
    this.posY = GROUND_Y
    this.velY = 0
    this.slideTimer = 0
    this.jumpsLeft = useGameStore.getState().getMaxJumps()
    this.animTime = 0
    this.landingTimer = 0
    this.hbHeight = PLAYER_HEIGHT
    this.hbWidth = PLAYER_WIDTH
    this.hbDepth = PLAYER_DEPTH

    this.mesh.position.set(LANES[1], GROUND_Y, 0)
    this.mesh.rotation.set(0, 0, 0)
    this.mesh.scale.set(1, 1, 1)

    // 重置骨骼
    if (this.hasSkeleton) {
      for (const ref of Object.values(this.bones)) {
        ref.bone.quaternion.copy(ref.restQuat)
        ref.bone.position.copy(ref.restPos)
      }
    }

    // 重置模型
    if (this.model) {
      this.model.rotation.set(0, 0, 0)
      this.model.scale.set(1, 1, 1)
      this.model.position.y = this.modelRestY
    }

    this.switchToRun()
  }
}
