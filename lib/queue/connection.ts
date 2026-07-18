/**
 * Kết nối Redis dùng chung cho BullMQ (queue phía API + worker).
 * BullMQ yêu cầu ioredis với maxRetriesPerRequest = null.
 */
import { Redis } from "ioredis"

let connection: Redis | undefined

export function getRedisConnection(): Redis {
  if (!connection) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379"
    connection = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }
  return connection
}
