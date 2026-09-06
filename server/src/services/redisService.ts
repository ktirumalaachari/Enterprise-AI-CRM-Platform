import { createClient, RedisClientType } from 'redis';

class RedisService {
  private client: RedisClientType | null = null;
  private isFallback = true;
  private memoryStore: Map<string, { value: string; expiry: number | null }> = new Map();

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.client = createClient({ url: redisUrl });

      this.client.on('error', () => {
        this.isFallback = true;
      });

      this.client.on('connect', () => {
        this.isFallback = false;
      });

      this.client.connect().catch(() => {
        this.isFallback = true;
      });
    } else {
      this.isFallback = true;
    }
  }

  // Set cache value
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isFallback && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, { EX: ttlSeconds });
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch (err) {
        console.error('Redis SET error:', err);
      }
    }

    // Fallback
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryStore.set(key, { value, expiry });
  }

  // Get cache value
  async get(key: string): Promise<string | null> {
    if (!this.isFallback && this.client) {
      try {
        return await this.client.get(key);
      } catch (err) {
        console.error('Redis GET error:', err);
      }
    }

    // Fallback
    const record = this.memoryStore.get(key);
    if (!record) return null;

    if (record.expiry && Date.now() > record.expiry) {
      this.memoryStore.delete(key);
      return null;
    }

    return record.value;
  }

  // Delete cache value
  async del(key: string): Promise<void> {
    if (!this.isFallback && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch (err) {
        console.error('Redis DEL error:', err);
      }
    }

    // Fallback
    this.memoryStore.delete(key);
  }

  // Close connection
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}

export const redisService = new RedisService();
export default redisService;
