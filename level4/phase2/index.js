import express from "express";
import dotenv from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  return res.json({ messsage: "hello from level 4" });
});

const llm_groq = new ChatGroq({
  model: "llama-3.1-8b-instant",
  temperature: 0.7,
  maxRetries: 2,
  maxTokens: 50,
});

const upload = async () => {
  const pdfPath = "./grocery.pdf";
  const buffer = fs.readFileSync(pdfPath);

  const pdfResult = new PDFParse({ data: buffer });
  const result = await pdfResult.getText();
  const text = result.text;
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 5000,
    chunkOverlap: 100,
  });
  const docs = await splitter.createDocuments([text]);
};
upload();

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001", // 768 dimensions
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
});

app.post("/groq", async (req, res) => {
  const { inp } = req.body;

  const response = await llm_groq.invoke([{ role: "user", content: inp }]);
  // console.log(response);

  return res.status(200).json({ aiMsg: response.content });
});

//------------------------------------------------------------------------------

app.listen(5000, () => {
  console.log("server started");
});
