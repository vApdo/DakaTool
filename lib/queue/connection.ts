/**
 * Kết nối Redis dùng chung cho BullMQ (queue phía API + worker).
 * BullMQ yêu cầu ioredis với maxRetriesPerRequest = null.
 */
import { Redis } from "ioredis"

function redisUrl(): string {
  return process.env.REDIS_URL ?? "redis://localhost:6379"
}

let connection: Redis | undefined

/** Kết nối dùng chung cho phía producer (enqueue job từ API). */
export function getRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis(redisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }
  return connection
}

/**
 * Kết nối MỚI, riêng biệt — dùng cho BullMQ Worker.
 * Worker dùng lệnh blocking (BRPOPLPUSH) để chờ job; nếu dùng chung kết nối với
 * producer, lệnh gia hạn khóa (renew lock) bị nghẽn sau lệnh blocking → job dài
 * mất khóa ("could not renew lock"). Vì vậy worker phải có kết nối riêng.
 */
export function createRedisConnection(): Redis {
  return new Redis(redisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}
