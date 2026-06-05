import { create } from 'zustand'
import { DEFAULT_MAP_ID } from '../maps/MapConfig'
import { COMBO_TIMEOUT, COMBO_MAX, MILESTONE_INTERVAL } from '../utils/constants'

export type GamePhase = 'menu' | 'playing' | 'dead' | 'shop' | 'mapselect'

// ── 藏宝库商品 ──
export interface ShopItem {
  id: string
  name: string
  desc: string
  cost: number
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'extra_life',   name: '续命丹',   desc: '每局多一条命（最多3条）', cost: 50 },
  { id: 'long_shield',  name: '金钟罩',   desc: '复活护体时间 2s → 4s',    cost: 30 },
  { id: 'score_x2',     name: '悟道心法', desc: '修为获取翻倍',            cost: 100 },
  { id: 'triple_jump',  name: '御风诀',   desc: '轻功增加一段（3段跳）',   cost: 80 },
]

// ── 道具类型 ──
export type PowerupType = 'magnet' | 'shield'

interface GameState {
  phase: GamePhase
  score: number
  coins: number            // 当局收集
  bestScore: number
  totalCoins: number       // 累计灵石（跨局持久化）
  speed: number
  jumpsLeft: number
  lives: number
  invincible: boolean
  owned: string[]          // 已购买商品 ID
  paused: boolean
  selectedMapId: string
  forkActive: boolean

  // 连击
  combo: number
  comboTimer: number

  // 里程碑
  nextMilestone: number
  milestoneMessage: string | null
  milestoneTimer: number

  // 道具效果
  magnetTimer: number
  shieldPickupTimer: number

  setPhase: (phase: GamePhase) => void
  addScore: (delta: number) => void
  addCoin: () => void
  setSpeed: (speed: number) => void
  setJumpsLeft: (n: number) => void
  loseLife: () => boolean
  setInvincible: (v: boolean) => void
  setPaused: (v: boolean) => void
  setSelectedMap: (id: string) => void
  setForkActive: (v: boolean) => void
  buyItem: (id: string) => boolean
  isOwned: (id: string) => boolean
  consumeItems: () => void
  getMaxLives: () => number
  getShieldDuration: () => number
  getScoreMultiplier: () => number
  getMaxJumps: () => number
  settleAndReturn: () => void
  reset: () => void

  // 连击
  incrementCombo: () => void
  resetCombo: () => void
  tickComboTimer: (delta: number) => void

  // 里程碑
  checkMilestone: (score: number) => void
  tickMilestoneTimer: (delta: number) => void

  // 道具
  activateMagnet: () => void
  activateShieldPickup: () => void
  tickPowerups: (delta: number) => void
}

const INITIAL_LIVES = 2

function loadOwned(): string[] {
  try { return JSON.parse(localStorage.getItem('xiuxian_owned') ?? '[]') } catch { return [] }
}
function saveOwned(owned: string[]) {
  localStorage.setItem('xiuxian_owned', JSON.stringify(owned))
}
function loadTotalCoins(): number {
  return Number(localStorage.getItem('xiuxian_stone') ?? 0)
}
function saveTotalCoins(n: number) {
  localStorage.setItem('xiuxian_stone', String(n))
}
function loadSelectedMap(): string {
  return localStorage.getItem('xiuxian_map') ?? DEFAULT_MAP_ID
}
function saveSelectedMap(id: string) {
  localStorage.setItem('xiuxian_map', id)
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'menu',
  score: 0,
  coins: 0,
  bestScore: Number(localStorage.getItem('xiuxian_best') ?? 0),
  totalCoins: loadTotalCoins(),
  speed: 0,
  jumpsLeft: 2,
  lives: INITIAL_LIVES,
  invincible: false,
  owned: loadOwned(),
  paused: false,
  selectedMapId: loadSelectedMap(),
  forkActive: false,

  // 连击
  combo: 0,
  comboTimer: 0,

  // 里程碑
  nextMilestone: MILESTONE_INTERVAL,
  milestoneMessage: null,
  milestoneTimer: 0,

  // 道具效果
  magnetTimer: 0,
  shieldPickupTimer: 0,

  setPhase: (phase) => {
    // 结算时把当局灵石转入累计
    if (phase === 'dead') {
      const { score, bestScore, coins, totalCoins } = get()
      const newTotal = totalCoins + coins
      saveTotalCoins(newTotal)
      if (score > bestScore) {
        localStorage.setItem('xiuxian_best', String(Math.floor(score)))
        set({ phase, bestScore: Math.floor(score), totalCoins: newTotal })
        return
      }
      set({ phase, totalCoins: newTotal })
      return
    }
    set({ phase })
  },

  addScore: (delta) => set((s) => ({ score: s.score + delta })),
  addCoin: () => set((s) => {
    const newCombo = Math.min(s.combo + 1, COMBO_MAX)
    return { coins: s.coins + 1, combo: newCombo, comboTimer: COMBO_TIMEOUT }
  }),
  setSpeed: (speed) => set({ speed }),
  setJumpsLeft: (n) => set({ jumpsLeft: n }),
  setInvincible: (v) => set({ invincible: v }),
  setPaused: (v) => set({ paused: v }),
  setSelectedMap: (id) => { saveSelectedMap(id); set({ selectedMapId: id }) },
  setForkActive: (v) => set({ forkActive: v }),

  loseLife: () => {
    const { lives } = get()
    if (lives <= 1) {
      set({ lives: 0 })
      return false
    }
    set({ lives: lives - 1, invincible: true })
    return true
  },

  buyItem: (id) => {
    const { totalCoins, owned } = get()
    const item = SHOP_ITEMS.find(i => i.id === id)
    if (!item || owned.includes(id) || totalCoins < item.cost) return false
    const newOwned = [...owned, id]
    const newTotal = totalCoins - item.cost
    saveOwned(newOwned)
    saveTotalCoins(newTotal)
    set({ owned: newOwned, totalCoins: newTotal })
    return true
  },

  isOwned: (id) => get().owned.includes(id),

  consumeItems: () => {
    saveOwned([])
    set({ owned: [] })
  },

  getMaxLives: () => get().owned.includes('extra_life') ? 3 : 2,
  getShieldDuration: () => get().owned.includes('long_shield') ? 4 : 2,
  getScoreMultiplier: () => get().owned.includes('score_x2') ? 2 : 1,
  getMaxJumps: () => get().owned.includes('triple_jump') ? 3 : 2,

  // ── 连击 ──
  incrementCombo: () => set((s) => ({
    combo: Math.min(s.combo + 1, COMBO_MAX),
    comboTimer: COMBO_TIMEOUT,
  })),
  resetCombo: () => set({ combo: 0, comboTimer: 0 }),
  tickComboTimer: (delta) => {
    const { comboTimer, combo } = get()
    if (combo > 0 && comboTimer > 0) {
      const next = comboTimer - delta
      if (next <= 0) {
        set({ combo: 0, comboTimer: 0 })
      } else {
        set({ comboTimer: next })
      }
    }
  },

  // ── 里程碑 ──
  checkMilestone: (score) => {
    const { nextMilestone } = get()
    if (score >= nextMilestone) {
      const msg = `已达 ${nextMilestone} 里`
      set({
        nextMilestone: nextMilestone + MILESTONE_INTERVAL,
        milestoneMessage: msg,
        milestoneTimer: 2.5,
      })
    }
  },
  tickMilestoneTimer: (delta) => {
    const { milestoneTimer } = get()
    if (milestoneTimer > 0) {
      const next = milestoneTimer - delta
      if (next <= 0) {
        set({ milestoneTimer: 0, milestoneMessage: null })
      } else {
        set({ milestoneTimer: next })
      }
    }
  },

  // ── 道具 ──
  activateMagnet: () => set({ magnetTimer: 8 }),
  activateShieldPickup: () => {
    set({ shieldPickupTimer: 5, invincible: true })
  },
  tickPowerups: (delta) => {
    const s = get()
    const changes: Partial<GameState> = {}
    if (s.magnetTimer > 0) {
      changes.magnetTimer = Math.max(0, s.magnetTimer - delta)
    }
    if (s.shieldPickupTimer > 0) {
      const next = s.shieldPickupTimer - delta
      changes.shieldPickupTimer = Math.max(0, next)
      if (next <= 0) changes.invincible = false
    }
    if (Object.keys(changes).length > 0) set(changes)
  },

  reset: () => {
    const s = get()
    const maxJumps = s.getMaxJumps()
    const maxLives = s.getMaxLives()
    // 一次性商品：读取后消耗
    s.consumeItems()
    set({
      score: 0, coins: 0, speed: 0,
      jumpsLeft: maxJumps,
      lives: maxLives,
      invincible: false,
      paused: false,
      combo: 0, comboTimer: 0,
      nextMilestone: MILESTONE_INTERVAL, milestoneMessage: null, milestoneTimer: 0,
      magnetTimer: 0, shieldPickupTimer: 0,
    })
  },

  settleAndReturn: () => {
    const { score, bestScore, coins, totalCoins } = get()
    const newTotal = totalCoins + coins
    saveTotalCoins(newTotal)
    const newBest = score > bestScore ? Math.floor(score) : bestScore
    if (score > bestScore) {
      localStorage.setItem('xiuxian_best', String(newBest))
    }
    set({ phase: 'menu', totalCoins: newTotal, bestScore: newBest, paused: false })
  },
}))
