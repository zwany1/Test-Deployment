import { FORK_INTERVAL, FORK_DECISION_ZONE, FORK_X_SHIFT, FORK_MAX_DRIFT, FORK_DECAY_RATE, OBSTACLE_MIN_GAP } from '../utils/constants'

export class ForkSystem {
  private nextForkZ = FORK_INTERVAL
  private forkCount = 0
  private _xDrift = 0
  private _targetDrift = 0          // 目标漂移值
  private _activeFork = false
  private forkPassed = false
  private chosenSide: 'left' | 'right' | null = null
  private lastForkZ = 0

  reset() {
    this.nextForkZ = FORK_INTERVAL + Math.random() * 100
    this.forkCount = 0
    this._xDrift = 0
    this._targetDrift = 0
    this._activeFork = false
    this.forkPassed = false
    this.chosenSide = null
    this.lastForkZ = 0
  }

  get xDrift() { return this._xDrift }
  get isActive() { return this._activeFork }
  get needsDefault() { return this.forkPassed && this.chosenSide === null }
  get currentForkZ() { return this.nextForkZ }
  get decisionStart() { return this.nextForkZ - FORK_DECISION_ZONE }

  tick(playerZ: number, delta: number): number {
    // ── 目标漂移衰减（岔路间逐渐回归中心）──
    if (this.lastForkZ > 0 && !this._activeFork) {
      const distSinceFork = playerZ - this.lastForkZ
      const decay = distSinceFork * FORK_DECAY_RATE
      if (this._targetDrift > 0) {
        this._targetDrift = Math.max(0, this._targetDrift - decay)
      } else if (this._targetDrift < 0) {
        this._targetDrift = Math.min(0, this._targetDrift + decay)
      }
      if (Math.abs(this._targetDrift) < 0.01) this._targetDrift = 0
    }

    // ── 实际漂移平滑插值到目标值（视觉过渡）──
    const lerpSpeed = 3.0 // 每秒插值速度
    const diff = this._targetDrift - this._xDrift
    if (Math.abs(diff) > 0.001) {
      this._xDrift += diff * Math.min(1, lerpSpeed * delta)
    } else {
      this._xDrift = this._targetDrift
    }

    // 进入决策区
    if (playerZ >= this.decisionStart && playerZ < this.nextForkZ && !this._activeFork) {
      this._activeFork = true
      this.chosenSide = null
      this.forkPassed = false
    }

    // 通过岔路点
    if (playerZ >= this.nextForkZ && this._activeFork) {
      this.forkPassed = true
    }

    // 应用选择并推进到下一个岔路
    if (this.forkPassed && this.chosenSide !== null) {
      const shift = this.chosenSide === 'left' ? -FORK_X_SHIFT : FORK_X_SHIFT
      this._targetDrift = Math.max(-FORK_MAX_DRIFT, Math.min(FORK_MAX_DRIFT, this._targetDrift + shift))
      this.forkCount++
      this._activeFork = false
      this.forkPassed = false
      this.lastForkZ = this.nextForkZ
      // 下一个岔路间隔（带随机偏移）
      this.nextForkZ += FORK_INTERVAL + Math.random() * OBSTACLE_MIN_GAP * 4
      this.chosenSide = null
    }

    return this._xDrift
  }

  chooseLeft() {
    if (this._activeFork && this.chosenSide === null) {
      this.chosenSide = 'left'
    }
  }

  chooseRight() {
    if (this._activeFork && this.chosenSide === null) {
      this.chosenSide = 'right'
    }
  }

  chooseDefault() {
    if (this.chosenSide === null) {
      this.chosenSide = Math.random() < 0.5 ? 'left' : 'right'
    }
  }
}
