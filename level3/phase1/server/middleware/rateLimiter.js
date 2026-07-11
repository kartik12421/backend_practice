import { redis } from "../index.js";

const rateLimiter = async (req, res, next) => {
  const ip = req.ip;
  const key = `rate limit: ${ip}`;
  const requestCount = await redis.incr(key);

  if (requestCount === 1) {
    await redis.expire(key, 60);
  }

  if (requestCount > 5) {
    return res.status(429).json({ message: "too many request" });
  }

  next();
};

export default rateLimiter;
