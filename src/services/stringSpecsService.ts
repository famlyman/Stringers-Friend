import { supabase } from "../lib/supabase";

export interface StringSpec {
  id: string;
  brand: string;
  model: string;
  category: string;
  gauge: string | null;
  color: string | null;
  description: string | null;
}

let stringCache: StringSpec[] | null = null;

export const stringSpecsService = {
  async getAll(): Promise<StringSpec[]> {
    if (stringCache) return stringCache;
    
    try {
      const { data, error } = await supabase
        .from('string_catalog')
        .select('*')
        .or('is_active.is.null,is_active.eq.true')
        .order('brand', { ascending: true })
        .order('model', { ascending: true });
      
      if (error) {
        console.warn('String catalog query failed:', error.message);
        return [];
      }
      
      stringCache = data || [];
      return stringCache;
    } catch (e: any) {
      console.warn('Failed to load string catalog:', e.message);
      return [];
    }
  },

  async searchBrands(): Promise<string[]> {
    const strings = await this.getAll();
    const brands = [...new Set(strings.map(s => s.brand))] as string[];
    return brands.sort();
  },

  async searchModels(brand: string, query: string = ''): Promise<string[]> {
    const strings = await this.getAll();
    let filtered = strings.filter(s => s.brand === brand);
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(s => 
        s.model.toLowerCase().includes(lowerQuery) ||
        s.gauge?.toLowerCase().includes(lowerQuery)
      );
    }
    
    const models = [...new Set(filtered.map(s => s.model))] as string[];
    return models.sort();
  },

  async getGauges(brand: string, model: string): Promise<string[]> {
    const strings = await this.getAll();
    const filtered = strings.filter(s => s.brand === brand && s.model === model);
    const gaugeSet = new Set<string>();
    filtered.forEach(s => {
      if (s.gauge) gaugeSet.add(s.gauge);
    });
    return Array.from(gaugeSet).sort();
  },

  async findString(brand: string, model: string, gauge?: string): Promise<StringSpec | null> {
    const strings = await this.getAll();
    let filtered = strings.filter(s => 
      s.brand === brand && s.model === model
    );
    
    if (gauge) {
      filtered = filtered.filter(s => s.gauge === gauge);
    }
    
    return filtered[0] || null;
  },

  async searchStrings(searchTerm: string): Promise<StringSpec[]> {
    const strings = await this.getAll();
    if (!searchTerm) return strings.slice(0, 50);
    
    const term = searchTerm.toLowerCase();
    return strings.filter(s => 
      s.brand.toLowerCase().includes(term) ||
      s.model.toLowerCase().includes(term) ||
      s.gauge?.toLowerCase().includes(term)
    ).slice(0, 50);
  },

  clearCache() {
    stringCache = null;
  }
};