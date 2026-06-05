export type InputAction = 'left' | 'right' | 'jump' | 'slide' | 'duck' | 'start' | 'pause'

type ActionHandler = (action: InputAction) => void

const COOLDOWNS: Partial<Record<InputAction, number>> = {
  jump: 0.12,
  slide: 0.15,
}

export class InputSystem {
  private handler: ActionHandler
  private cooldowns: Partial<Record<InputAction, number>> = {}

  // touch
  private touchStartX = 0
  private touchStartY = 0
  private isDucking = false
  private readonly SWIPE_THRESHOLD = 40
  private readonly DUCK_THRESHOLD = 50  // 下蹲触发阈值

  private _keydown!: (e: KeyboardEvent) => void
  private _touchstart!: (e: TouchEvent) => void
  private _touchmove!: (e: TouchEvent) => void
  private _touchend!: (e: TouchEvent) => void

  constructor(handler: ActionHandler) {
    this.handler = handler
    this.setupKeyboard()
    this.setupTouch()
  }

  private fire(action: InputAction) {
    const cd = COOLDOWNS[action] ?? 0
    if (cd > 0) {
      const last = this.cooldowns[action] ?? 0
      if (performance.now() - last < cd * 1000) return
      this.cooldowns[action] = performance.now()
    }
    this.handler(action)
  }

  private setupKeyboard() {
    this._keydown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyA': case 'ArrowLeft':  this.fire('left');  break
        case 'KeyD': case 'ArrowRight': this.fire('right'); break
        case 'Space': e.preventDefault(); this.fire('jump'); break
        case 'KeyS': case 'ArrowDown':  this.fire('slide'); break
        case 'KeyC':  this.fire('duck');  break  // C键下蹲
        case 'Escape': this.fire('pause'); break
        case 'Enter': this.fire('start'); break
      }
    }
    window.addEventListener('keydown', this._keydown)
  }

  private setupTouch() {
    this._touchstart = (e: TouchEvent) => {
      this.touchStartX = e.changedTouches[0].clientX
      this.touchStartY = e.changedTouches[0].clientY
      this.isDucking = false
    }
    this._touchmove = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - this.touchStartY
      // 持续下滑超过阈值 -> 下蹲
      if (dy > this.DUCK_THRESHOLD && !this.isDucking) {
        this.isDucking = true
        this.fire('duck')
      }
    }
    this._touchend = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - this.touchStartX
      const dy = e.changedTouches[0].clientY - this.touchStartY

      // 如果正在下蹲，松手时停止下蹲
      if (this.isDucking) {
        this.isDucking = false
        this.fire('duck')  // 再次触发duck让Player切换状态
        return
      }

      // 点击（没有明显移动）-> 开始/暂停
      if (Math.abs(dx) < this.SWIPE_THRESHOLD && Math.abs(dy) < this.SWIPE_THRESHOLD) {
        this.fire('start')
        return
      }
      // 滑动手势
      if (Math.abs(dx) > Math.abs(dy)) {
        this.fire(dx < 0 ? 'left' : 'right')
      } else {
        this.fire(dy < 0 ? 'jump' : 'slide')  // 上滑跳跃，下滑滑铲
      }
    }
    window.addEventListener('touchstart', this._touchstart, { passive: true })
    window.addEventListener('touchmove', this._touchmove, { passive: true })
    window.addEventListener('touchend', this._touchend, { passive: true })
  }

  dispose() {
    window.removeEventListener('keydown', this._keydown)
    window.removeEventListener('touchstart', this._touchstart)
    window.removeEventListener('touchmove', this._touchmove)
    window.removeEventListener('touchend', this._touchend)
  }
}
