import Redis from 'ioredis'

let redis: Redis | null = null
const memoryCache = new Map<string, { value: string; expiresAt: number }>()

function getRedis(): Redis | null {
  if (redis) return redis

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null

  try {
    redis = new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
    })

    redis.on('error', () => {
      redis = null
    })

    return redis
  } catch {
    return null
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  const client = getRedis()
  if (client) {
    try {
      return await client.get(key)
    } catch {
      // fallback to memory
    }
  }

  const entry = memoryCache.get(key)
  if (entry && entry.expiresAt > Date.now()) {
    return entry.value
  }
  memoryCache.delete(key)
  return null
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const client = getRedis()
  if (client) {
    try {
      await client.set(key, value, 'EX', ttlSeconds)
      return
    } catch {
      // fallback to memory
    }
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedis()
  if (client) {
    try {
      await client.del(key)
    } catch {
      // ignore
    }
  }
  memoryCache.delete(key)
}
