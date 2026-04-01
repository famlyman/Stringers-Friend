import { GoogleGenAI, Type } from "@google/genai";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface RacquetSpec {
  brand: string;
  model: string;
  headSize: number;
  patternMains: number;
  patternCrosses: number;
  tensionRangeMin: number;
  tensionRangeMax: number;
  mainsSkip?: string;
  mainsTieOff?: string;
  crossesStart?: string;
  crossesTieOff?: string;
  onePieceLength?: string;
  twoPieceLength?: string;
  stringingInstructions?: string;
  length?: number;
  unstrungWeight?: number;
  balance?: string;
  swingweight?: number;
  stiffness?: number;
  beamWidth?: string;
}

export const racquetSpecsService = {
  async getSpecs(brand: string, model: string): Promise<RacquetSpec | null> {
    // 1. Check Cache First
    const cacheId = `${brand.toLowerCase().replace(/\s+/g, '_')}_${model.toLowerCase().replace(/\s+/g, '_')}`;
    try {
      const cacheRef = doc(db, "racquet_specs_cache", cacheId);
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        console.log("Returning cached racquet specs for:", brand, model);
        return cacheSnap.data().specs as RacquetSpec;
      }
    } catch (cacheError) {
      console.warn("Error checking racquet specs cache:", cacheError);
    }

    // 2. Call Gemini if not in cache
    const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
      const prompt = `Provide the technical stringing specifications for the following tennis racquet:
      Brand: ${brand}
      Model: ${model}
      
      Include head size (sq in), string pattern (mains x crosses), and recommended tension range (lbs).
      Crucially, include detailed stringing instructions:
      - Mains Skip: Which holes are skipped (e.g., 7H, 9H, 7T, 9T)
      - Mains Tie-off: Where to tie off the mains (e.g., 8T)
      - Crosses Start: Where the crosses start (e.g., Head or Throat)
      - Crosses Tie-off: Where to tie off the crosses (e.g., 5H, 11T)
      - One Piece Length: Total length for one-piece stringing (ft)
      - Two Piece Length: Length for two-piece stringing (ft)
      - General Instructions: Any other specific notes (e.g., "Start at Head", "No shared holes").

      Use reliable sources like KlipperUSA (https://klipperusa.com/pages/racquet-stringing-patterns), USRSA, or manufacturer technical manuals.
      If you can find more details like length, weight, balance, swingweight, stiffness, and beam width, include them too.
      Return the response in JSON format.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              brand: { type: Type.STRING },
              model: { type: Type.STRING },
              headSize: { type: Type.NUMBER, description: "Head size in square inches" },
              patternMains: { type: Type.NUMBER, description: "Number of main strings" },
              patternCrosses: { type: Type.NUMBER, description: "Number of cross strings" },
              tensionRangeMin: { type: Type.NUMBER, description: "Minimum recommended tension in lbs" },
              tensionRangeMax: { type: Type.NUMBER, description: "Maximum recommended tension in lbs" },
              mainsSkip: { type: Type.STRING, description: "Skipped holes for mains (e.g., 7H, 9H, 7T, 9T)" },
              mainsTieOff: { type: Type.STRING, description: "Tie-off location for mains (e.g., 8T)" },
              crossesStart: { type: Type.STRING, description: "Starting point for crosses (e.g., Head or Throat)" },
              crossesTieOff: { type: Type.STRING, description: "Tie-off location for crosses (e.g., 5H, 11T)" },
              onePieceLength: { type: Type.STRING, description: "Total length for one-piece stringing in feet" },
              twoPieceLength: { type: Type.STRING, description: "Total length for two-piece stringing in feet" },
              stringingInstructions: { type: Type.STRING, description: "General stringing instructions" },
              length: { type: Type.NUMBER, description: "Length in inches" },
              unstrungWeight: { type: Type.NUMBER, description: "Unstrung weight in grams" },
              balance: { type: Type.STRING, description: "Balance point" },
              swingweight: { type: Type.NUMBER, description: "Swingweight" },
              stiffness: { type: Type.NUMBER, description: "Stiffness (RA)" },
              beamWidth: { type: Type.STRING, description: "Beam width in mm" }
            },
            required: ["brand", "model", "headSize", "patternMains", "patternCrosses", "tensionRangeMin", "tensionRangeMax"]
          }
        }
      });

      if (response.text) {
        try {
          const cleanedText = response.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
          const specs = JSON.parse(cleanedText) as RacquetSpec;

          // 3. Save to Cache
          try {
            await setDoc(doc(db, "racquet_specs_cache", cacheId), {
              id: cacheId,
              brand: specs.brand || brand,
              model: specs.model || model,
              specs: specs,
              created_at: serverTimestamp()
            });
          } catch (cacheSaveError) {
            console.warn("Error saving racquet specs to cache:", cacheSaveError);
          }

          return specs;
        } catch (parseError) {
          console.error("Error parsing racquet specs JSON:", parseError, response.text);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching racquet specs:", error);
      return null;
    }
  },

  async searchModels(brand: string, query: string): Promise<string[]> {
    // 1. Check Cache First
    const cacheId = `search_${brand.toLowerCase().replace(/\s+/g, '_')}_${query.toLowerCase().replace(/\s+/g, '_')}`;
    try {
      const cacheRef = doc(db, "racquet_specs_cache", cacheId);
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        console.log("Returning cached model search results for:", brand, query);
        return cacheSnap.data().results as string[];
      }
    } catch (cacheError) {
      console.warn("Error checking model search cache:", cacheError);
    }

    const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set");
      return [];
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
      const prompt = `List the specific tennis racquet models for the brand "${brand}" that match or are related to "${query}".
      Include all sub-models (e.g., Pro, MP, Team, Lite, Tour, S, L, etc.).
      Search through reliable sources like KlipperUSA (https://klipperusa.com/pages/racquet-stringing-patterns), USRSA, and manufacturer sites to find all variations.
      Return only a JSON array of strings containing the full model names.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      if (response.text) {
        try {
          const cleanedText = response.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
          const results = JSON.parse(cleanedText) as string[];

          // 2. Save to Cache
          try {
            await setDoc(doc(db, "racquet_specs_cache", cacheId), {
              id: cacheId,
              brand: brand,
              query: query,
              results: results,
              created_at: serverTimestamp()
            });
          } catch (cacheSaveError) {
            console.warn("Error saving model search to cache:", cacheSaveError);
          }

          return results;
        } catch (parseError) {
          console.error("Error parsing racquet models JSON:", parseError, response.text);
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error("Error searching racquet models:", error);
      return [];
    }
  }
};
