import * as THREE from 'three'
import type { MapConfig } from '../maps/MapConfig'

export class GameScene {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer

  private config!: MapConfig
  private floorTiles: THREE.Mesh[] = []
  private readonly TILE_LENGTH = 40
  private readonly TILE_COUNT = 6

  private particles!: THREE.Points
  private particlePositions!: Float32Array
  private readonly PARTICLE_COUNT = 200

  private speedLines: THREE.Line[] = []
  private speedLineTimer = 0

  private clouds: THREE.Group[] = []
  private envGroup: THREE.Group

  constructor(canvas: HTMLCanvasElement, map: MapConfig) {
    this.config = map
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(map.background)
    this.scene.fog = new THREE.Fog(map.fogColor, map.fogNear, map.fogFar)

    this.camera = new THREE.PerspectiveCamera(65, canvas.clientWidth / canvas.clientHeight, 0.1, 300)
    this.camera.position.set(0, 6, -12)
    this.camera.lookAt(0, 1.5, 20)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.6

    this.envGroup = new THREE.Group()
    this.scene.add(this.envGroup)

    this.setupLights(map)
    this.setupFloor(map)
    this.setupMountains(map)
    this.setupClouds(map)
    this.setupParticles(map)
    this.setupResizeHandler(canvas)
  }

  applyMap(map: MapConfig) {
    this.config = map
    this.scene.background = new THREE.Color(map.background)
    this.scene.fog = new THREE.Fog(map.fogColor, map.fogNear, map.fogFar)

    // 移除旧环境
    while (this.envGroup.children.length > 0) {
      this.envGroup.remove(this.envGroup.children[0])
    }
    for (const t of this.floorTiles) { this.scene.remove(t) }
    this.floorTiles = []
    this.clouds = []

    if (this.particles) { this.scene.remove(this.particles) }
    for (const l of this.speedLines) { this.scene.remove(l) }
    this.speedLines = []

    // 重建
    this.setupLights(map)
    this.setupFloor(map)
    this.setupMountains(map)
    this.setupClouds(map)
    this.setupParticles(map)
  }

  // ── 光照 ──────────────────────────────────────────────

  private setupLights(map: MapConfig) {
    const ambient = new THREE.AmbientLight(map.ambientColor, map.ambientIntensity)
    this.envGroup.add(ambient)

    const dirLight = new THREE.DirectionalLight(map.dirLightColor, map.dirLightIntensity)
    dirLight.position.set(8, 20, -10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 100
    dirLight.shadow.camera.left = -20
    dirLight.shadow.camera.right = 20
    dirLight.shadow.camera.top = 25
    dirLight.shadow.camera.bottom = -5
    dirLight.shadow.bias = -0.001
    this.envGroup.add(dirLight)

    const fillLight = new THREE.DirectionalLight(map.fillLightColor, 1)
    fillLight.position.set(-5, 10, 5)
    this.envGroup.add(fillLight)

    const skyLight = new THREE.HemisphereLight(map.hemisphereSky, map.hemisphereGround, 1.5)
    this.envGroup.add(skyLight)
  }

  // ── 路面 ──────────────────────────────────────────────

  private setupFloor(map: MapConfig) {
    for (let i = 0; i < this.TILE_COUNT; i++) {
      const tile = this.createFloorTile(map)
      tile.position.z = i * this.TILE_LENGTH
      this.floorTiles.push(tile)
      this.scene.add(tile)
    }
  }

  private createFloorTile(map: MapConfig): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(12, this.TILE_LENGTH, 6, 24)
    geo.rotateX(-Math.PI / 2)

    const mat = new THREE.MeshStandardMaterial({
      color: map.floorColor,
      roughness: map.floorRoughness,
      metalness: 0.05,
      emissive: map.floorEmissive,
      emissiveIntensity: map.floorEmissiveIntensity,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.receiveShadow = true

    const lineMat = new THREE.MeshBasicMaterial({ color: map.floorLineColor, transparent: true, opacity: 0.3 })
    for (const laneX of [-1.5, 1.5]) {
      for (let d = 0; d < this.TILE_LENGTH; d += 4) {
        const lineGeo = new THREE.PlaneGeometry(0.03, 2.5)
        lineGeo.rotateX(-Math.PI / 2)
        const line = new THREE.Mesh(lineGeo, lineMat)
        line.position.set(laneX, 0.005, d - this.TILE_LENGTH / 2 + 1.25)
        mesh.add(line)
      }
    }

    for (const edgeX of [-5.98, 5.98]) {
      const edgeGeo = new THREE.PlaneGeometry(0.15, this.TILE_LENGTH)
      edgeGeo.rotateX(-Math.PI / 2)
      const edgeMat = new THREE.MeshBasicMaterial({ color: map.floorEdgeColor, transparent: true, opacity: 0.5 })
      const edge = new THREE.Mesh(edgeGeo, edgeMat)
      edge.position.set(edgeX, 0.003, 0)
      mesh.add(edge)
    }

    return mesh
  }

  // ── 远山 ──────────────────────────────────────────────

  private setupMountains(map: MapConfig) {
    this.createMountainRange(80, map.mountainColors[0], 25, 0.4)
    this.createMountainRange(60, map.mountainColors[1], 20, 0.6)
    this.createMountainRange(40, map.mountainColors[2], 18, 0.8)

    this.createSideCliff(-14, map.cliffColor)
    this.createSideCliff(14, map.cliffColor)

    this.createGroundPlane(map)
  }

  private createMountainRange(dist: number, color: number, height: number, opacity: number) {
    const g = new THREE.Group()
    for (let i = 0; i < 12; i++) {
      const w = 15 + Math.random() * 25
      const h = height * (0.5 + Math.random() * 0.5)
      const geo = new THREE.ConeGeometry(w / 2, h, 4 + Math.floor(Math.random() * 3))
      const mat = new THREE.MeshStandardMaterial({
        color, transparent: true, opacity,
        roughness: 1, metalness: 0,
      })
      const mountain = new THREE.Mesh(geo, mat)
      mountain.position.set(
        (i - 6) * 12 + Math.random() * 8,
        h / 2 - 2,
        dist + Math.random() * 20,
      )
      mountain.rotation.y = Math.random() * 0.3
      g.add(mountain)
    }
    this.envGroup.add(g)
  }

  private createSideCliff(x: number, color: number) {
    const geo = new THREE.BoxGeometry(6, 30, 300)
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.95, metalness: 0,
      emissive: 0x1a1510, emissiveIntensity: 0.1,
    })
    const cliff = new THREE.Mesh(geo, mat)
    cliff.position.set(x, 12, 80)
    this.envGroup.add(cliff)

    const lineMat = new THREE.MeshBasicMaterial({ color: 0x3a3020, transparent: true, opacity: 0.3 })
    for (let j = 0; j < 15; j++) {
      const lineGeo = new THREE.PlaneGeometry(5, 0.08)
      const line = new THREE.Mesh(lineGeo, lineMat)
      line.position.set(x - (x > 0 ? 2.5 : -2.5), Math.random() * 25, j * 20 - 10)
      line.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2
      this.envGroup.add(line)
    }

    for (let k = 0; k < 8; k++) {
      const mossGeo = new THREE.PlaneGeometry(0.8 + Math.random() * 0.5, 0.4 + Math.random() * 0.3)
      const mossMat = new THREE.MeshBasicMaterial({ color: 0x6a8a50, transparent: true, opacity: 0.25 })
      const moss = new THREE.Mesh(mossGeo, mossMat)
      moss.position.set(x - (x > 0 ? 2.5 : -2.5), Math.random() * 15 + 2, Math.random() * 60 + 20)
      moss.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2
      this.envGroup.add(moss)
    }
  }

  private createGroundPlane(map: MapConfig) {
    for (const side of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(60, 300)
      geo.rotateX(-Math.PI / 2)
      const mat = new THREE.MeshStandardMaterial({
        color: map.groundColor,
        roughness: 0.9,
        metalness: 0,
      })
      const ground = new THREE.Mesh(geo, mat)
      ground.position.set(side * 35, -0.05, 80)
      ground.receiveShadow = true
      this.envGroup.add(ground)
    }
  }

  // ── 云朵 ──────────────────────────────────────────────

  private setupClouds(map: MapConfig) {
    for (let i = 0; i < 8; i++) {
      const cloud = this.createCloud(map)
      cloud.position.set(
        (Math.random() - 0.5) * 40,
        12 + Math.random() * 15,
        40 + Math.random() * 60,
      )
      this.clouds.push(cloud)
      this.envGroup.add(cloud)
    }
  }

  private createCloud(map: MapConfig): THREE.Group {
    const g = new THREE.Group()
    const cloudMat = new THREE.MeshStandardMaterial({
      color: map.cloudColor,
      transparent: true,
      opacity: map.cloudOpacity,
      roughness: 1,
      metalness: 0,
    })
    const count = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const size = 2 + Math.random() * 3
      const geo = new THREE.SphereGeometry(size, 8, 6)
      const puff = new THREE.Mesh(geo, cloudMat)
      puff.position.set(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 2,
      )
      puff.scale.y = 0.4
      g.add(puff)
    }
    return g
  }

  // ── 粒子 ──────────────────────────────────────────────

  private setupParticles(map: MapConfig) {
    const geo = new THREE.BufferGeometry()
    this.particlePositions = new Float32Array(this.PARTICLE_COUNT * 3)
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particlePositions[i * 3] = (Math.random() - 0.5) * 14
      this.particlePositions[i * 3 + 1] = Math.random() * 6 + 0.5
      this.particlePositions[i * 3 + 2] = Math.random() * 60
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3))

    const mat = new THREE.PointsMaterial({
      color: map.particleColor,
      size: map.particleSize,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    })
    this.particles = new THREE.Points(geo, mat)
    this.scene.add(this.particles)
  }

  private setupResizeHandler(canvas: HTMLCanvasElement) {
    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(w, h)
    })
    ro.observe(canvas)
  }

  // ── 更新 ──────────────────────────────────────────────

  updateFloor(playerZ: number, xDrift: number) {
    for (const tile of this.floorTiles) {
      if (tile.position.z < playerZ - this.TILE_LENGTH) {
        tile.position.z += this.TILE_COUNT * this.TILE_LENGTH
      }
      tile.position.x = xDrift
    }
  }

  updateEnvDrift(xDrift: number) {
    this.envGroup.position.x = xDrift
  }

  updateParticles(playerZ: number, delta: number) {
    const attr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particlePositions[i * 3 + 1] -= delta * 0.5
      this.particlePositions[i * 3 + 2] -= delta * 3
      this.particlePositions[i * 3] += Math.sin(performance.now() * 0.001 + i) * delta * 0.3

      if (this.particlePositions[i * 3 + 2] < playerZ - 5 ||
          this.particlePositions[i * 3 + 1] < 0) {
        this.particlePositions[i * 3] = (Math.random() - 0.5) * 14
        this.particlePositions[i * 3 + 1] = 4 + Math.random() * 4
        this.particlePositions[i * 3 + 2] = playerZ + 50 + Math.random() * 20
      }
    }
    attr.needsUpdate = true

    for (const cloud of this.clouds) {
      cloud.position.x += delta * 0.15
      if (cloud.position.x > 30) cloud.position.x = -30
    }
  }

  updateSpeedLines(playerZ: number, speed: number, delta: number) {
    this.speedLineTimer -= delta
    if (speed > 18 && this.speedLineTimer <= 0) {
      this.speedLineTimer = 0.12
      this.addSpeedLine(playerZ)
    }
    this.speedLines = this.speedLines.filter(l => {
      if ((l.userData.life as number) <= 0) {
        this.scene.remove(l)
        return false
      }
      l.userData.life = (l.userData.life as number) - delta
      const mat = l.material as THREE.LineBasicMaterial
      mat.opacity = Math.max(0, l.userData.life as number) * 2
      return true
    })
  }

  private addSpeedLine(playerZ: number) {
    const x = (Math.random() - 0.5) * 10
    const y = Math.random() * 3 + 0.5
    const points = [
      new THREE.Vector3(x, y, playerZ - 6),
      new THREE.Vector3(x + (Math.random() - 0.5) * 0.3, y, playerZ - 1),
    ]
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineBasicMaterial({
      color: this.config.speedLineColor, transparent: true, opacity: 0.4,
    })
    const line = new THREE.Line(geo, mat)
    line.userData.life = 0.4
    this.scene.add(line)
    this.speedLines.push(line)
  }

  render() { this.renderer.render(this.scene, this.camera) }
  dispose() { this.renderer.dispose() }
}
