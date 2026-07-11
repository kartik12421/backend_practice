import express from "express";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 3000;

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({ message: "hello from order service" });
});

app.listen(port, () => {
  console.log(`server start for level 3 phase 2......Order service... at port ${port}`);
});
