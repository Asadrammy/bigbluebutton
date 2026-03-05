/**
 * Dictionary Service
 * Manages DGS sign language dictionary with backend sync
 */
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '@config/environment';
import tokenManager from '@utils/tokenManager';
import { AnimationData } from '@types/index';

const DICTIONARY_CACHE_KEY = '@dictionary_cache';
const CACHE_EXPIRY_KEY = '@dictionary_cache_expiry';

export interface DGSSign {
  word: string;
  language: string;
  signLanguage: string;
  animationData?: AnimationData;
  videoUrl?: string;
  category?: string;
  difficulty?: string;
  usageCount?: number;
  description?: string;
}

export interface SignListResponse {
  signs: DGSSign[];
  total: number;
}

class DictionaryService {
  private api: AxiosInstance;
  private cache: DGSSign[] = [];
  private cacheExpiry: number = 0;

  constructor() {
    this.api = axios.create({
      baseURL: `${config.apiBaseUrl}/text-to-sign`,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup token manager
    tokenManager.setupInterceptors(this.api);

    // Load cache on init
    this.loadCache();
  }

  /**
   * Get all available signs with optional search
   */
  async getSigns(search?: string): Promise<DGSSign[]> {
    try {
      const params = search ? { search } : {};
      const response = await this.api.get<any>('/signs', { params });

      const signs = response.data.signs.map(this.mapFromApi);

      // Update cache
      this.cache = signs;
      this.cacheExpiry = Date.now() + config.cacheExpiryDays * 24 * 60 * 60 * 1000;
      await this.saveCache();

      return signs;
    } catch (error) {
      // If offline or error, return cached data
      if (config.enableOfflineMode && this.cache.length > 0 && Date.now() < this.cacheExpiry) {
        // Filter cache if search term provided
        if (search) {
          const searchLower = search.toLowerCase();
          return this.cache.filter(sign => 
            sign.word.toLowerCase().includes(searchLower) ||
            sign.category?.toLowerCase().includes(searchLower)
          );
        }
        return this.cache;
      }
      throw error;
    }
  }

  /**
   * Get a specific sign by word/name
   */
  async getSignByName(name: string): Promise<DGSSign> {
    try {
      const response = await this.api.get<any>(`/sign/${encodeURIComponent(name)}`);
      return this.mapFromApi(response.data);
    } catch (error) {
      // Try to find in cache
      if (config.enableOfflineMode) {
        const cachedSign = this.cache.find(
          sign => sign.word.toLowerCase() === name.toLowerCase()
        );
        if (cachedSign) {
          return cachedSign;
        }
      }
      throw error;
    }
  }

  /**
   * Get animation data for a sign
   */
  async getSignAnimation(name: string): Promise<AnimationData | null> {
    const sign = await this.getSignByName(name);
    return sign.animationData || null;
  }

  /**
   * Search signs by category
   */
  async getSignsByCategory(category: string): Promise<DGSSign[]> {
    const signs = await this.getSigns();
    return signs.filter(sign => sign.category === category);
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    const signs = await this.getSigns();
    const categories = new Set<string>();
    
    signs.forEach(sign => {
      if (sign.category) {
        categories.add(sign.category);
      }
    });

    return Array.from(categories).sort();
  }

  /**
   * Get cached signs (for offline use)
   */
  getCachedSigns(search?: string): DGSSign[] {
    if (search) {
      const searchLower = search.toLowerCase();
      return this.cache.filter(sign => 
        sign.word.toLowerCase().includes(searchLower) ||
        sign.category?.toLowerCase().includes(searchLower)
      );
    }
    return this.cache;
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(): boolean {
    return this.cache.length > 0 && Date.now() < this.cacheExpiry;
  }

  /**
   * Force refresh cache from server
   */
  async refreshCache(): Promise<void> {
    await this.getSigns();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Map API response to local format
   */
  private mapFromApi(data: any): DGSSign {
    return {
      word: data.word || data.sign_name,
      language: data.language || 'de',
      signLanguage: data.sign_language || 'DGS',
      animationData: data.animation_data,
      videoUrl: data.video_url,
      category: data.category,
      difficulty: data.difficulty,
      usageCount: data.usage_count,
      description: data.description,
    };
  }

  /**
   * Load cache from AsyncStorage
   */
  private async loadCache(): Promise<void> {
    try {
      const [cached, expiry] = await Promise.all([
        AsyncStorage.getItem(DICTIONARY_CACHE_KEY),
        AsyncStorage.getItem(CACHE_EXPIRY_KEY),
      ]);

      if (cached) {
        this.cache = JSON.parse(cached);
      }

      if (expiry) {
        this.cacheExpiry = parseInt(expiry, 10);
      }
    } catch (error) {
      console.error('Failed to load dictionary cache:', error);
    }
  }

  /**
   * Save cache to AsyncStorage
   */
  private async saveCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(DICTIONARY_CACHE_KEY, JSON.stringify(this.cache)),
        AsyncStorage.setItem(CACHE_EXPIRY_KEY, this.cacheExpiry.toString()),
      ]);
    } catch (error) {
      console.error('Failed to save dictionary cache:', error);
    }
  }

  /**
   * Clear cache (for testing/debugging)
   */
  async clearCache(): Promise<void> {
    this.cache = [];
    this.cacheExpiry = 0;
    await Promise.all([
      AsyncStorage.removeItem(DICTIONARY_CACHE_KEY),
      AsyncStorage.removeItem(CACHE_EXPIRY_KEY),
    ]);
  }
}

const dictionaryService = new DictionaryService();
export default dictionaryService;

