import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import {
  Annotation,
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  return res.json({ messsage: "hello from level 4" });
});

//----------------------------WITHOUT LANGCHAIN---------------------------------

// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });

// app.post("/ai", async (req, res) => {
//   try {
//     const { inp } = req.body;

//     // Call the Interactions API correctly
//     const response = await ai.interactions.create({
//       model: "gemini-3.5-flash",
//       system_instruction: "You are an AI assistant and your name is Jarvis. If you don't know the answer then simplly say that you don't know.",
//       input: inp, // Pass the user input directly here
//     });

//     return res.status(200).json({ ai: response.output_text });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Something went wrong" });
//   }
// });

//---------------------------------------------------------------------

//----------------------WITH LANGCHAIN------------------------------------------

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash",
  // temperature: 0,
  // maxRetries: 2,
});

const tool = new TavilySearch({
  maxResults: 5,
  topic: "general",
  // includeAnswer: false,
  // includeRawContent: false,
  // includeImages: false,
  // includeImageDescriptions: false,
  // searchDepth: "basic",
  // timeRange: "day",
  // includeDomains: [],
  // excludeDomains: [],
});

const memory = new MemorySaver();

const tools = [tool];
const toolNode = new ToolNode(tools);

const llm_groq = new ChatGroq({
  model: "llama-3.1-8b-instant",
  temperature: 0,
  maxRetries: 2,
  maxTokens: 50,
}).bindTools(tools);

//----------------------LangGraph-------------------------------------

const State = Annotation.Root({
  prompt: Annotation,
  aiMsg: Annotation,
});

const callLLM = async (State) => {
  console.log("State: ", State);

  const response = await llm_groq.invoke([
    [
      "system",
      "You are a persional AI assistant. Your name is manthan madarchod. If you don't know answer, then don't give wrong one.",
    ],
    // ["human", State.messages[0].content],
    ...State.messages,
  ]);
  return { messages: [response] };
};

const shouldContinue = async (State) => {
  const lastMessage = State.messages[State.messages.length - 1];
  if (lastMessage.tool_calls.length > 0) {
    return "tools";
  } else {
    return "__end__";
  }
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callLLM)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  // .addEdge("agent", "__end__")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .compile({ checkpointer: memory });

//------------------------------------------------------------------------

app.post("/gemini", async (req, res) => {
  const { inp } = req.body;

  const response = await llm.invoke([
    ["system", "You are a persional AI assistant. Your name is Chitti."],
    ["human", inp],
  ]);
  return res.status(200).json({ message: response.content });
});

app.post("/groq", async (req, res) => {
  const { inp } = req.body;

  // const response = await llm_groq.invoke([
  //   [
  //     "system",
  //     "You are a persional AI assistant. Your name is manthan madarchod. You can abuse me. If i abuse you, you abuse me too.",
  //   ],
  //   ["human", inp],
  // ]);
  // return res.status(200).json({ message: response.content });

  const response = await graph.invoke(
    {
      messages: [{ role: "user", content: inp }],
    },
    { configurable: { thread_id: "user123" } },
  );
  console.log(response);

  return res
    .status(200)
    .json({ aiMsg: response.messages[response.messages.length - 1].content });
});

//------------------------------------------------------------------------------

app.listen(5000, () => {
  console.log("server started");
});
