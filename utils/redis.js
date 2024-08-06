import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
    constructor() {
        this.client = redis.createClient();
	this.isConnected = true;
        this.client.on('error', (err) => {
	    this.isConnected = false;
            console.error('Redis client error:', err);
        });

        this.getAsync = promisify(this.client.get).bind(this.client);
        this.setAsync = promisify(this.client.set).bind(this.client);
        this.delAsync = promisify(this.client.del).bind(this.client);

    }

    isAlive() {
        return this.isConnected;
    }

    async get(key) {
        return await this.getAsync(key);
    }

    async set(key, value, duration) {
        await this.setAsync(key, value, 'EX', duration);
    }

    async del(key) {
        await this.delAsync(key);
    }

}

const redisClient = new RedisClient();
export default redisClient;
