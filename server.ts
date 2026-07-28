import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Travel Insights Endpoint
app.post("/api/ai-insights", async (req, res) => {
  try {
    const { trip, prompt: userPrompt } = req.body;
    if (!trip && !userPrompt) {
      return res.status(400).json({ error: "Trip data or prompt is required" });
    }

    if (!aiClient) {
      // Return smart fallback insights if API key is not present
      const fallbackText = userPrompt?.includes("budget") 
        ? "Your spending seems to be on track, but keep an eye on food and miscellaneous costs. Consider using local transport to save about 15%."
        : userPrompt?.includes("itinerary")
        ? "Day 1: City center exploration. Day 2: Nature trail and scenic views. Day 3: Local markets and culinary tour."
        : "Travel Hack: Always keep a digital copy of your documents. Use local SIM cards for better data rates.";
      
      return res.json({ text: fallbackText });
    }

    const systemInstruction = `
You are a senior Travel Tech Expert and Financial Assistant.
Analyze the trip data provided and respond to the specific user query.
Keep responses professional, data-driven, and highly actionable.
Focus on cost optimization, logical flow, and local expert knowledge.
`;

    const fullPrompt = `
Trip Context:
- Name: ${trip?.name || "Untitled Trip"}
- Destination: ${trip?.destination || "Unknown"}
- Purpose: ${trip?.purpose || "Leisure"}
- Budget: ${trip?.currency || "₹"}${trip?.totalBudget || 0}
- Travellers: ${trip?.travellers?.length || 1}
- Itinerary Items: ${trip?.timeline?.length || 0}
- Expenses: ${trip?.expenses?.length || 0}

User Query: ${userPrompt || "Analyze my trip and provide insights."}

Provide a concise, high-impact response.
`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.6-flash",
      contents: fullPrompt,
      config: {
        systemInstruction,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error generating AI insights:", error);
    res.status(500).json({
      error: "Failed to generate AI insights",
      details: error.message,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
