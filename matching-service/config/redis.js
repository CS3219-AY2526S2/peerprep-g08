const redis = require('redis');
require('dotenv').config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
  await redisClient.connect();
  console.log('Connected to Redis');
})();

module.exports = redisClient;
