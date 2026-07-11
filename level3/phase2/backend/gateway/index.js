import express from "express";
import dotenv from "dotenv";
import proxy from "express-http-proxy";

dotenv.config();

const port = process.env.PORT || 3000;

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res
    .status(200)
    .json({ message: `hello from gateway - ${process.env.SERVER_NAME}` });
});

app.use("/auth", proxy("http://auth-service:8001"));
app.use("/order", proxy("http://order-service:8002"));
app.use("/product", proxy("http://product-service:8003"));

app.listen(port, () => {
  console.log(
    `server start for level 3 phase 2......API Gateway using - (express-http-proxy)... at port ${port}`,
  );
});
