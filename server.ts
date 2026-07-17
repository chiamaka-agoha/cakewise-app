import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Ensure DNS resolution works correctly in sandboxed containers
dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = 3000;

// Enable JSON parsing with a limit suitable for base64 image uploads
app.use(express.json({ limit: "15mb" }));

// Lazy initializer for the GoogleGenAI client to prevent startup failure if API key is absent
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please add it to your environment variables or Settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// REST route to analyze user-uploaded cake reference photos via Gemini 3.5 Flash
app.post("/api/analyze-cake", async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing image data" });
    }

    // Clean base64 data to remove potential shell or header residues
    let base64Data = image;
    let actualMime = mimeType || "image/png";

    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        actualMime = match[1];
        base64Data = match[2];
      }
    }

    const ai = getGeminiClient();

    const imagePart = {
      inlineData: {
        mimeType: actualMime,
        data: base64Data,
      },
    };

    const promptText = `
You are CakeWise-AI, an expert baker, cake designer and pricing auditor in Nigeria.
Analyze this cake reference image. Inspect its design details very carefully to identify design complexity, structural specifications, and help price it accurately.

Determine:
1. "isCakeDetected": Is a cake clearly visible and identifiable in the photo? Set to true if yes, or false if no cake is detected or if the image is too blurry/unclear to make any estimate.
2. "detectedDesignElements": List the design elements seen in the photo (e.g., gold foil, sugar flowers, handmade toppers, custom text, intricate stencils, textures, drip, fondant-covered vs plain rustic finish, toy toppers, ribbons).
3. "suggestedComplexity": Decide between 'Simple', 'Moderate', or 'Complex'.
   Rules:
   - 'Simple': Standard buttercream/whipped cream, basic borders, minimal to no modeling, simple piping, standard toppers.
   - 'Moderate': Custom stencils, gold drips, moderate sugar flowers, simple edible prints, multiple piping patterns, minor tier decorations.
   - 'Complex': Extensive hand-sculpted fondant figurines, hyper-detailed textures, heavy gold leaf, cascading sugar flowers, intricate themed sculptures, custom structures, or extreme decoration density.
4. "justification": A professional, brief, polite explanation in English (Nigerian kitchen context) of why you chose this complexity level and what elements require more labor and specialized skill/time.
5. "suggestedTiers": An integer count of visual tiers visible in the photo (e.g. 1 tier, 2 tiers, 3 tiers). If not a cake or unclear, return 1.
6. "suggestedFrosting": Likely frosting covering type. Choose from: 'Buttercream', 'Whipping Cream', 'Ganache', or 'Fondant'. If unclear, default to 'Buttercream'.
7. "estimatedSizes": An array of numbers (in inches) representing the estimated size/diameter of each tier, ordered from bottom tier to top tier. For example, [10, 8] for a 2-tier cake, or [8] for a single-tier cake. If unclear, use the best visual estimate, but if no cake is detected, use [8].
8. "estimatedLayers": An array of integers representing the estimated number of layers for each tier, ordered from bottom tier to top tier. For example, [2, 2] or [3] for a single-tier cake. Usually 2, 3, or 4 layers per tier. If unclear, return 2 for each tier.
9. "confidenceNote": A short confidence or estimation note.
   - If a cake is detected but there is some uncertainty or estimating from visual photo, use: "Estimated based on visual analysis".
   - If NO cake is detected or image is too unclear, use EXACTLY: "Using standard estimate due to unclear image".

Return your findings in strict JSON matching the requested response schema.
    `;

    const textPart = {
      text: promptText,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCakeDetected: {
              type: Type.BOOLEAN,
              description: "True if a cake is clearly visible and identifiable in the image; false if no cake is detected or if the image is too blurry/unclear to make any estimate."
            },
            detectedDesignElements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Items seen like sugar flowers, stenciling, gold foil, fondant characters."
            },
            suggestedComplexity: {
              type: Type.STRING,
              description: "Must be 'Simple', 'Moderate', or 'Complex'."
            },
            justification: {
              type: Type.STRING,
              description: "Detailed professional reasoning of how the visual complexity impacts professional baker labor hours."
            },
            suggestedTiers: {
              type: Type.INTEGER,
              description: "Estimated number of tiers visually visible in the reference photo. Return 1 if unclear or not a cake."
            },
            suggestedFrosting: {
              type: Type.STRING,
              description: "Likely frosting covering type. Choose from: 'Buttercream', 'Whipping Cream', 'Ganache', or 'Fondant'."
            },
            estimatedSizes: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description: "Estimated size (diameter in inches) for each tier, ordered from bottom tier to top tier. Realistic sizes are 6, 8, 10, 12, etc."
            },
            estimatedLayers: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "Estimated number of layers for each tier, ordered from bottom tier to top tier. Usually 2, 3, or 4 layers per tier."
            },
            confidenceNote: {
              type: Type.STRING,
              description: "Provide a confidence/estimation note. If a cake is detected, use 'Estimated based on visual analysis'. If no cake is detected or image is too unclear, use 'Using standard estimate due to unclear image'."
            }
          },
          required: [
            "isCakeDetected",
            "detectedDesignElements",
            "suggestedComplexity",
            "justification",
            "suggestedTiers",
            "suggestedFrosting",
            "estimatedSizes",
            "estimatedLayers",
            "confidenceNote"
          ]
        }
      }
    });

    const parsedResult = JSON.parse(response.text || "{}");
    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Error running cake analysis using Gemini:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to analyze cake photo.",
      details: error.stack || ""
    });
  }
});

// Configure Vite middleware or static serving depending on environment
async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server successfully running at http://localhost:${PORT}`);
  });
}

configureServer().catch((err) => {
  console.error("Failed to start full-stack server configuration:", err);
});
