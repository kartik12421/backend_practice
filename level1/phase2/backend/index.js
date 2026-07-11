import express from "express";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 5000;

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "hello brooo......." });
});

app.listen(port, () => {
  console.log(`server start of phase 2... at port ${port}`);
});
