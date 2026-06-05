import * as THREE from 'three'
import { FORK_DECISION_ZONE, FORK_X_SHIFT } from '../utils/constants'
import type { ForkSystem } from '../systems/ForkSystem'

export class ForkRenderer {
  private scene: THREE.Scene
  private forkGroup: THREE.Group | null = null
  private activeForkZ = -Infinity

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  update(playerZ: number, xDrift: number, forkSystem: ForkSystem) {
    const forkZ = forkSystem.currentForkZ
    const decisionStart = forkSystem.decisionStart

    // 当玩家接近岔路时创建几何体
    if (playerZ >= decisionStart - 5 && playerZ < forkZ + 10 && !this.forkGroup) {
      this.createFork(forkZ, xDrift)
      this.activeForkZ = forkZ
    }

    // 玩家通过后清理
    if (this.forkGroup && playerZ > this.activeForkZ + 15) {
      this.clear()
    }
  }

  private createFork(forkZ: number, xDrift: number) {
    const g = new THREE.Group()

    const roadWidth = 6
    const branchLength = 25
    const angle = 0.22  // ~12.5度

    // 路面材质
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x7a8a7a,
      roughness: 0.85,
      metalness: 0.05,
      emissive: 0x1a2a1a,
      emissiveIntensity: 0.15,
    })

    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x5a6a5a, transparent: true, opacity: 0.4,
    })

    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0x8a7a30, transparent: true, opacity: 0.6,
    })

    // ── 左岔路 ──
    const leftGeo = new THREE.PlaneGeometry(roadWidth, branchLength)
    leftGeo.translate(0, branchLength / 2, 0)
    leftGeo.rotateX(-Math.PI / 2)
    const leftRoad = new THREE.Mesh(leftGeo, roadMat.clone())
    leftRoad.rotation.y = angle
    leftRoad.position.set(xDrift - 0.5, 0.001, forkZ)
    leftRoad.receiveShadow = true
    g.add(leftRoad)

    // 左路边线
    const leftEdgeGeo = new THREE.PlaneGeometry(0.12, branchLength)
    leftEdgeGeo.translate(0, branchLength / 2, 0)
    leftEdgeGeo.rotateX(-Math.PI / 2)
    for (const side of [-roadWidth / 2, roadWidth / 2]) {
      const edge = new THREE.Mesh(leftEdgeGeo, lineMat)
      edge.rotation.y = angle
      edge.position.set(xDrift - 0.5 + Math.sin(angle) * side * 0.5, 0.003, forkZ + Math.cos(angle) * side * 0.3)
      g.add(edge)
    }

    // ── 右岔路 ──
    const rightGeo = new THREE.PlaneGeometry(roadWidth, branchLength)
    rightGeo.translate(0, branchLength / 2, 0)
    rightGeo.rotateX(-Math.PI / 2)
    const rightRoad = new THREE.Mesh(rightGeo, roadMat.clone())
    rightRoad.rotation.y = -angle
    rightRoad.position.set(xDrift + 0.5, 0.001, forkZ)
    rightRoad.receiveShadow = true
    g.add(rightRoad)

    // 右路边线
    const rightEdgeGeo = new THREE.PlaneGeometry(0.12, branchLength)
    rightEdgeGeo.translate(0, branchLength / 2, 0)
    rightEdgeGeo.rotateX(-Math.PI / 2)
    for (const side of [-roadWidth / 2, roadWidth / 2]) {
      const edge = new THREE.Mesh(rightEdgeGeo, lineMat)
      edge.rotation.y = -angle
      edge.position.set(xDrift + 0.5 - Math.sin(angle) * side * 0.5, 0.003, forkZ + Math.cos(angle) * side * 0.3)
      g.add(edge)
    }

    // ── 中央分隔带 ──
    const dividerGeo = new THREE.PlaneGeometry(0.15, FORK_DECISION_ZONE)
    dividerGeo.rotateX(-Math.PI / 2)
    const divider = new THREE.Mesh(dividerGeo, lineMat)
    divider.position.set(xDrift, 0.004, forkZ - FORK_DECISION_ZONE / 2)
    g.add(divider)

    // ── 左箭头指示 ──
    const arrowGeo = new THREE.ConeGeometry(0.4, 1.2, 3)
    arrowGeo.rotateZ(Math.PI)
    arrowGeo.rotateY(Math.PI / 2)

    const leftArrow = new THREE.Mesh(arrowGeo, arrowMat)
    leftArrow.position.set(xDrift - 2, 0.3, forkZ - 5)
    leftArrow.rotation.z = -0.3
    g.add(leftArrow)

    // ── 右箭头指示 ──
    const rightArrow = new THREE.Mesh(arrowGeo.clone(), arrowMat.clone())
    rightArrow.position.set(xDrift + 2, 0.3, forkZ - 5)
    rightArrow.rotation.z = 0.3
    g.add(rightArrow)

    // ── 岔路点标记（地面前方菱形）──
    const markerGeo = new THREE.PlaneGeometry(1.2, 1.2)
    markerGeo.rotateX(-Math.PI / 2)
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xaa8830, transparent: true, opacity: 0.3, depthWrite: false,
    })
    const marker = new THREE.Mesh(markerGeo, markerMat)
    marker.position.set(xDrift, 0.005, forkZ - 2)
    marker.rotation.y = Math.PI / 4
    g.add(marker)

    this.scene.add(g)
    this.forkGroup = g
  }

  clear() {
    if (this.forkGroup) {
      this.scene.remove(this.forkGroup)
      this.forkGroup.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh
          if (m.geometry) m.geometry.dispose()
          if (m.material) {
            if (Array.isArray(m.material)) {
              m.material.forEach(mat => mat.dispose())
            } else {
              m.material.dispose()
            }
          }
        }
      })
      this.forkGroup = null
    }
  }
}
