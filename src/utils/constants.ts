export const LANES = [-3, 0, 3] as const
export const LANE_WIDTH = 3

export const INITIAL_SPEED = 12
export const MAX_SPEED = 30
export const SPEED_INCREMENT = 0.4 // per second

export const JUMP_VELOCITY = 16
export const GRAVITY = -35
export const GROUND_Y = 0
export const PLAYER_HEIGHT = 1.8
export const PLAYER_WIDTH = 0.8
export const PLAYER_DEPTH = 0.8

export const SLIDE_HEIGHT = 0.35
export const SLIDE_DURATION = 0.8 // seconds

export const LANE_SWITCH_DURATION = 0.15 // seconds

export const SPAWN_Z = 70
export const DESPAWN_Z = -15

export const COIN_VALUE = 10
export const DISTANCE_SCALE = 1   // units -> meters display (1 unit = 1m)

export const OBSTACLE_MIN_GAP = 10
export const OBSTACLE_MAX_GAP = 18

export const COIN_FLOAT_Y = 1.2

// 岔路系统
export const FORK_INTERVAL = 300        // Z 单位间隔
export const FORK_DECISION_ZONE = 20    // 决策区长度
export const FORK_X_SHIFT = 3           // 每次偏移量（一个车道宽）
export const FORK_MAX_DRIFT = 12        // 最大累积漂移（降低，避免画面偏移过大）
export const FORK_DECAY_RATE = 0.006    // 每 Z 单位衰减率（加快回归中心）

// 连击系统
export const COMBO_TIMEOUT = 2.0        // 秒内未吃到灵石则连击归零
export const COMBO_MAX = 20             // 最大连击倍率

// 里程里程碑
export const MILESTONE_INTERVAL = 500   // 每 500 里触发一次

// 拾取道具
export const POWERUP_SPAWN_CHANCE = 0.12  // 每次生成组时出现道具的概率
export const MAGNET_DURATION = 8          // 磁铁持续秒数
export const MAGNET_RADIUS = 8            // 磁铁吸附半径
export const SHIELD_PICKUP_DURATION = 5   // 拾取无敌持续秒数
