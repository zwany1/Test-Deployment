export type InputAction = 'left' | 'right' | 'jump' | 'slide' | 'start' | 'pause'

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
  private readonly SWIPE_THRESHOLD = 40

  private _keydown!: (e: KeyboardEvent) => void
  private _touchstart!: (e: TouchEvent) => void
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
    }
    this._touchend = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - this.touchStartX
      const dy = e.changedTouches[0].clientY - this.touchStartY
      if (Math.abs(dx) < this.SWIPE_THRESHOLD && Math.abs(dy) < this.SWIPE_THRESHOLD) {
        this.fire('start')
        return
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        this.fire(dx < 0 ? 'left' : 'right')
      } else {
        this.fire(dy < 0 ? 'jump' : 'slide')
      }
    }
    window.addEventListener('touchstart', this._touchstart, { passive: true })
    window.addEventListener('touchend', this._touchend, { passive: true })
  }

  dispose() {
    window.removeEventListener('keydown', this._keydown)
    window.removeEventListener('touchstart', this._touchstart)
    window.removeEventListener('touchend', this._touchend)
  }
}
