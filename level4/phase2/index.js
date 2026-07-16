import express from "express";
import dotenv from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";

dotenv.config();

const app = express();
app.use(express.json());

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;
const RETRIEVAL_LIMIT = 3;
const MAX_CONTEXT_CHARS = 3000;

app.get("/", (req, res) => {
  return res.json({ messsage: "hello from level 4" });
});

const llm_groq = new ChatGroq({
  model: "llama-3.1-8b-instant",
  temperature: 0.7,
  maxRetries: 2,
  maxTokens: 50,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001", // 768 dimensions
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL,
  collectionName: "grocery store",
});

const upload = async () => {
  const pdfPath = "./grocery.pdf";
  const buffer = fs.readFileSync(pdfPath);

  const pdfResult = new PDFParse({ data: buffer });
  const result = await pdfResult.getText();
  const text = result.text;
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });
  const docs = await splitter.createDocuments([text]);
  await vectorStore.addDocuments(docs);
};
upload();

app.post("/groq", async (req, res) => {
  try {
    const { inp } = req.body;

    if (!inp?.trim()) {
      return res.status(400).json({ error: "inp is required" });
    }

    const docs = await vectorStore.similaritySearch(inp, RETRIEVAL_LIMIT);

    const rawContext = docs.map((d) => d.pageContent.trim()).join("\n\n");
    const context = rawContext.slice(0, MAX_CONTEXT_CHARS);

    const response = await llm_groq.invoke([
      {
        role: "system",
        content: `You are a RAG AI assistant.

Strict Rules:
1. Answer only from the provided context.
2. Do not use outside knowledge.
3. If the answer is not in the context, say exactly: "I don't know from uploaded data."
4. Keep the answer concise.
5. Context is about a grocery store having two type of data - Grocery items and its price respectively.
6. If user asking about benefits of any perticular item, or to compare between two items, do it through your own knowledge.
7. If user is asking for sorting grocery according to price, do it. You can also use your own intelligence to read and understand the data.

Context:
${context}`,
      },
      { role: "user", content: inp },
    ]);

    return res.status(200).json({ aiMsg: response.content });
  } catch (error) {
    console.error("Groq request failed:", error);
    return res.status(500).json({
      error: "Failed to generate response. Try a shorter question or smaller context.",
    });
  }
});

//------------------------------------------------------------------------------

app.listen(5000, () => {
  console.log("server started");
});
