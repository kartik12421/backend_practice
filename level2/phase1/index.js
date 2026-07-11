import express from "express";
import dotenv from "dotenv";
import connectDb from "./lib/db.js";
import User from "./models/user.model.js";
import Redis from "ioredis";
import rateLimiter from "./middleware/rateLimiter.js";
import sendEmail from "./lib/sendEmail.js";
import emailQueue from "./queue.js";

dotenv.config();

const port = process.env.PORT || 3000;

export const redis = new Redis(process.env.REDIS_URL);

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "hello brooo.......redis" });
});

app.post("/create", async (req, res) => {
  const { name, email, password } = req.body;
  await redis.del("user:all");
  const user = await User.create({
    name,
    email,
    password,
  });

  await emailQueue.add("send-email", { email });

  return res.json(user);
});

app.get("/get", rateLimiter, async (req, res) => {
  const user = await User.find({});

  return res.json(user);
});

app.get("/rget", async (req, res) => {
  const cachedHit = await redis.get("user:all");
  if (cachedHit) {
    const user = JSON.parse(cachedHit);
    return res.json(user);
  }
  const user = await User.find({});
  await redis.set("user:all", JSON.stringify(user));

  return res.json(user);
});

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await redis.set(`otp:${email}`, otp, "EX", 30);

  return res.json({ otp });
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const cachedOtp = await redis.get(`otp:${email}`);
  if (!otp) {
    return res.status(400).json({ message: "opt not found" });
  }

  if (cachedOtp != otp) {
    return res.status(400).json({ message: "incorrect otp" });
  }

  await redis.del(`otp:${email}`);

  return res.json({ message: "otp verified" });
});

app.listen(port, () => {
  console.log(`server start for redis part 2 phase 1... at port ${port}`);
  connectDb();
});
