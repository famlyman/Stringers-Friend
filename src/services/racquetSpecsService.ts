import { supabase } from "../lib/supabase";
import { PREDEFINED_RACQUETS } from "../data/racquetDatabase";

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

// Parse tension range from string like "50-60 lbs" or "50-60"
function parseTensionRange(range: string | null): { min: number; max: number } {
  if (!range) return { min: 50, max: 60 };
  
  const match = range.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) };
  }
  return { min: 50, max: 60 };
}

// Parse string pattern from string like "16x19" or "16 mains x 19 crosses"
function parseStringPattern(pattern: string | null): { mains: number; crosses: number } {
  if (!pattern) return { mains: 16, crosses: 19 };
  
  const match = pattern.match(/(\d+)\s*[xX×]\s*(\d+)/);
  if (match) {
    return { mains: parseInt(match[1]), crosses: parseInt(match[2]) };
  }
  
  // Try to find single numbers
  const numbers = pattern.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    return { mains: parseInt(numbers[0]), crosses: parseInt(numbers[1]) };
  }
  
  return { mains: 16, crosses: 19 };
}

export const racquetSpecsService = {
  async getSpecs(brand: string, model: string): Promise<RacquetSpec | null> {
    // 1. Check Local Predefined Database
    const brandData = PREDEFINED_RACQUETS[brand];
    if (brandData && brandData[model]) {
      console.log("Returning predefined racquet specs for:", brand, model);
      return brandData[model] as RacquetSpec;
    }

    // 2. Check Database Cache
    try {
      const { data: cachedData, error: cacheError } = await supabase
        .from('racquet_specs_cache')
        .select('*')
        .ilike('brand', brand)
        .ilike('model', model)
        .maybeSingle();

      if (cacheError) {
        console.warn("Error checking racquet specs cache:", cacheError);
      }

      if (cachedData) {
        console.log("Returning cached racquet specs for:", brand, model);
        
        // Parse tension range
        const tensionRange = parseTensionRange(cachedData.tension_range);
        
        // Parse string pattern
        const stringPattern = parseStringPattern(cachedData.string_pattern);
        
        return {
          brand: cachedData.brand,
          model: cachedData.model,
          headSize: parseInt(cachedData.head_size) || 100,
          patternMains: stringPattern.mains,
          patternCrosses: stringPattern.crosses,
          tensionRangeMin: tensionRange.min,
          tensionRangeMax: tensionRange.max,
          stringingInstructions: cachedData.stringing_instructions,
        };
      }
    } catch (cacheError) {
      console.warn("Error checking racquet specs cache:", cacheError);
    }

    // 3. Gemini API is disabled due to CSP restrictions
    // Users can manually enter specs or use predefined data
    console.log("Racquet specs not found in cache. Manual entry required for:", brand, model);
    return null;
  },

  async searchModels(brand: string, query: string): Promise<string[]> {
    // Search in predefined database first
    const brandData = PREDEFINED_RACQUETS[brand];
    if (brandData) {
      const models = Object.keys(brandData);
      const matchingModels = models.filter(model => 
        model.toLowerCase().includes(query.toLowerCase())
      );
      if (matchingModels.length > 0) {
        console.log("Returning predefined models for:", brand, query);
        return matchingModels.slice(0, 10); // Limit to 10 results
      }
    }

    // Search in database cache
    try {
      const { data: cachedData, error: cacheError } = await supabase
        .from('racquet_specs_cache')
        .select('model')
        .ilike('brand', brand)
        .ilike('model', `%${query}%`);

      if (cacheError) {
        console.warn("Error searching models in cache:", cacheError);
      }

      if (cachedData && cachedData.length > 0) {
        console.log("Returning cached models for:", brand, query);
        return cachedData.map(c => c.model).slice(0, 10);
      }
    } catch (cacheError) {
      console.warn("Error searching models in cache:", cacheError);
    }

    // No results found - user will need to enter manually
    console.log("No models found for:", brand, query);
    return [];
  },

  // Get all available brands from predefined database
  getAvailableBrands(): string[] {
    return Object.keys(PREDEFINED_RACQUETS);
  },

  // Get all models for a brand from predefined database
  getModelsForBrand(brand: string): string[] {
    const brandData = PREDEFINED_RACQUETS[brand];
    if (brandData) {
      return Object.keys(brandData);
    }
    return [];
  },

  async searchRacquets(brandQuery: string, modelQuery: string): Promise<Array<{ brand: string; model: string }>> {
    let query = supabase
      .from('racquet_specs_cache')
      .select('brand, model')
      .limit(50);

    if (brandQuery) {
      const searchTerm = brandQuery.toLowerCase().replace('tennis', '').trim();
      query = query.ilike('brand', `%${searchTerm}%`);
    }

    if (modelQuery) {
      query = query.ilike('model', `%${modelQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Error searching racquets:", error);
      return [];
    }

    return data || [];
  },

  async getAllBrands(): Promise<string[]> {
    const { data, error } = await supabase
      .from('racquet_specs_cache')
      .select('brand')
      .limit(1000);

    if (error) {
      console.warn("Error fetching brands:", error);
      return [];
    }

    const brands = new Set<string>();
    data?.forEach(row => {
      const brandName = row.brand.replace(/\s+Tennis$/i, '').trim();
      brands.add(brandName);
      brands.add(row.brand);
    });

    return Array.from(brands).sort();
  },

  async getModelsByBrand(brand: string): Promise<string[]> {
    const normalizedBrand = brand.includes('Tennis') ? brand : `${brand} Tennis`;
    
    const { data, error } = await supabase
      .from('racquet_specs_cache')
      .select('model')
      .or(`brand.eq.${brand},brand.eq.${normalizedBrand}`)
      .order('model');

    if (error) {
      console.warn("Error fetching models:", error);
      return [];
    }

return data?.map(r => r.model) || [];
  }
};
