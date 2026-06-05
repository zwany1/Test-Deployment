import { Player } from '../player/Player'
import type { GameEntity } from '../obstacles/ObstacleManager'

const TOLERANCE = 0.25  // 容差

export function checkCollision(player: Player, entity: GameEntity): boolean {
  const px = player.mesh.position.x
  const py = player.mesh.position.y + player.hbHeight / 2
  const pz = player.mesh.position.z

  const ex = entity.mesh.position.x
  const ey = entity.mesh.position.y
  const ez = entity.mesh.position.z

  const dx = Math.abs(px - ex)
  const dy = Math.abs(py - ey)
  const dz = Math.abs(pz - ez)

  const phw = player.hbWidth / 2 - TOLERANCE
  const phh = player.hbHeight / 2
  const phd = player.hbDepth / 2 - TOLERANCE

  return dx < phw + entity.hw &&
    dy < phh + entity.hh &&
    dz < phd + entity.hd
}
