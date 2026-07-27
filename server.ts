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
    const { trip } = req.body;
    if (!trip) {
      return res.status(400).json({ error: "Trip data is required" });
    }

    if (!aiClient) {
      // Return smart fallback insights if API key is not present
      return res.json({
        cheaperRoutes: [
          `Consider taking local express trains or overnight buses for segment '${trip.destination}' to save up to 25% on transport.`,
          `Booking flights 3-4 weeks in advance usually lowers airfare costs significantly for ${trip.destination}.`
        ],
        predictedFuelCost: trip.totalBudget ? Math.round(trip.totalBudget * 0.18) : 2500,
        predictedTotalCost: trip.totalBudget ? Math.round(trip.totalBudget * 0.92) : 22000,
        budgetWarning: trip.totalSpent > trip.totalBudget ? "CRITICAL: Current spending exceeds your total trip budget!" : null,
        hotelSuggestions: [
          `Boutique Stays & Heritage Hotels near ${trip.destination} city center`,
          `Eco-resorts with group discounts`
        ],
        restaurantSuggestions: [
          `Authentic local street food markets in ${trip.destination}`,
          `Top-rated family diners with local culinary specialties`
        ],
        travelInsights: [
          `Best time for sightseeing in ${trip.destination} is early morning to avoid peak traffic.`,
          `Keep digital copies of all traveler documents in your TripPro Document Vault.`
        ]
      });
    }

    const prompt = `
You are a senior Travel Tech Expert and Financial Software Architect.
Analyze the following trip parameters and provide structured recommendations in JSON format.

Trip Details:
- Name: ${trip.name}
- Destination: ${trip.destination}
- Purpose: ${trip.purpose}
- Currency: ${trip.currency || "₹"}
- Total Budget: ${trip.totalBudget}
- Total Spent: ${trip.totalSpent}
- Number of Travellers: ${trip.travellers?.length || 1}
- Transport Segments: ${JSON.stringify(trip.segments || [])}
- Expenses Breakdown: ${JSON.stringify(trip.expenses || [])}

Provide a JSON object strictly matching this schema:
{
  "cheaperRoutes": ["suggestion 1", "suggestion 2"],
  "predictedFuelCost": 1200,
  "predictedTotalCost": 15000,
  "budgetWarning": "warning string or null",
  "hotelSuggestions": ["hotel 1", "hotel 2"],
  "restaurantSuggestions": ["restaurant 1", "restaurant 2"],
  "travelInsights": ["insight 1", "insight 2"]
}
Only output valid JSON.
`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    res.json(data);
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
