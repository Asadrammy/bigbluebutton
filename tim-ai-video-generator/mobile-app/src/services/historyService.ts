/**
 * History Service
 * Manages translation history with backend sync
 */
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '@config/environment';
import tokenManager from '@utils/tokenManager';
import { Language, SignLanguage } from '@types/index';

const HISTORY_CACHE_KEY = '@history_cache';
const PENDING_HISTORY_KEY = '@pending_history';

export interface TranslationHistoryItem {
  id?: number;
  sourceText: string;
  targetText: string;
  sourceLanguage: Language | SignLanguage;
  targetLanguage: Language | SignLanguage;
  translationType: 'text' | 'speech' | 'sign';
  confidence?: number;
  processingTime?: number;
  createdAt?: string;
}

export interface HistoryListResponse {
  items: TranslationHistoryItem[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

export interface HistoryStats {
  totalTranslations: number;
  totalByType: Record<string, number>;
  totalByLanguage: Record<string, number>;
  avgConfidence?: number;
  avgProcessingTime?: number;
}

class HistoryService {
  private api: AxiosInstance;
  private cache: TranslationHistoryItem[] = [];
  private pendingQueue: TranslationHistoryItem[] = [];

  constructor() {
    this.api = axios.create({
      baseURL: `${config.apiBaseUrl}/history`,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup token manager
    tokenManager.setupInterceptors(this.api);

    // Load cache on init
    this.loadCache();
    this.loadPendingQueue();
  }

  /**
   * Save translation to history (with offline support)
   */
  async saveTranslation(data: TranslationHistoryItem): Promise<TranslationHistoryItem> {
    const historyData = {
      source_text: data.sourceText,
      target_text: data.targetText,
      source_language: data.sourceLanguage,
      target_language: data.targetLanguage,
      translation_type: data.translationType,
      confidence: data.confidence,
      processing_time: data.processingTime,
    };

    try {
      const response = await this.api.post<any>('/save', historyData);
      const savedItem = this.mapFromApi(response.data);

      // Add to cache
      this.cache.unshift(savedItem);
      await this.saveCache();

      return savedItem;
    } catch (error) {
      if (config.enableOfflineMode) {
        // Save to pending queue for later sync
        const pendingItem = {
          ...data,
          createdAt: new Date().toISOString(),
        };
        this.pendingQueue.push(pendingItem);
        await this.savePendingQueue();

        // Add to cache for immediate display
        this.cache.unshift(pendingItem);
        await this.saveCache();

        return pendingItem;
      }
      throw error;
    }
  }

  /**
   * Get paginated history
   */
  async getHistory(
    page: number = 1,
    perPage: number = 20,
    translationType?: 'text' | 'speech' | 'sign',
    language?: string
  ): Promise<HistoryListResponse> {
    try {
      const params: any = { page, per_page: perPage };
      if (translationType) params.translation_type = translationType;
      if (language) params.language = language;

      const response = await this.api.get<any>('/list', { params });

      const items = response.data.items.map(this.mapFromApi);

      // Update cache with first page
      if (page === 1) {
        this.cache = items;
        await this.saveCache();
      }

      return {
        items,
        total: response.data.total,
        page: response.data.page,
        perPage: response.data.per_page,
        pages: response.data.pages,
      };
    } catch (error) {
      // If offline, return cached data
      if (config.enableOfflineMode && this.cache.length > 0) {
        return {
          items: this.cache,
          total: this.cache.length,
          page: 1,
          perPage: this.cache.length,
          pages: 1,
        };
      }
      throw error;
    }
  }

  /**
   * Get single history item
   */
  async getHistoryItem(id: number): Promise<TranslationHistoryItem> {
    const response = await this.api.get<any>(`/${id}`);
    return this.mapFromApi(response.data);
  }

  /**
   * Delete history item
   */
  async deleteHistoryItem(id: number): Promise<void> {
    await this.api.delete(`/${id}`);

    // Remove from cache
    this.cache = this.cache.filter(item => item.id !== id);
    await this.saveCache();
  }

  /**
   * Clear all history
   */
  async clearAllHistory(): Promise<void> {
    await this.api.delete('/clear-all');

    // Clear cache
    this.cache = [];
    await this.saveCache();
  }

  /**
   * Get history statistics
   */
  async getHistoryStats(): Promise<HistoryStats> {
    const response = await this.api.get<any>('/stats/overview');
    return {
      totalTranslations: response.data.total_translations,
      totalByType: response.data.total_by_type,
      totalByLanguage: response.data.total_by_language,
      avgConfidence: response.data.avg_confidence,
      avgProcessingTime: response.data.avg_processing_time,
    };
  }

  /**
   * Sync pending items (for offline mode)
   */
  async syncPendingItems(): Promise<void> {
    if (this.pendingQueue.length === 0) return;

    const itemsToSync = [...this.pendingQueue];
    const syncedItems: number[] = [];

    for (let i = 0; i < itemsToSync.length; i++) {
      try {
        await this.saveTranslation(itemsToSync[i]);
        syncedItems.push(i);
      } catch (error) {
        console.error('Failed to sync history item:', error);
        // Continue with next item
      }
    }

    // Remove synced items from pending queue
    this.pendingQueue = this.pendingQueue.filter((_, index) => !syncedItems.includes(index));
    await this.savePendingQueue();
  }

  /**
   * Get cached history (for offline use)
   */
  getCachedHistory(): TranslationHistoryItem[] {
    return this.cache;
  }

  /**
   * Get pending items count
   */
  getPendingCount(): number {
    return this.pendingQueue.length;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Map API response to local format
   */
  private mapFromApi(data: any): TranslationHistoryItem {
    return {
      id: data.id,
      sourceText: data.source_text,
      targetText: data.target_text,
      sourceLanguage: data.source_language,
      targetLanguage: data.target_language,
      translationType: data.translation_type,
      confidence: data.confidence,
      processingTime: data.processing_time,
      createdAt: data.created_at,
    };
  }

  /**
   * Load cache from AsyncStorage
   */
  private async loadCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(HISTORY_CACHE_KEY);
      if (cached) {
        this.cache = JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load history cache:', error);
    }
  }

  /**
   * Save cache to AsyncStorage
   */
  private async saveCache(): Promise<void> {
    try {
      // Keep only last 100 items in cache
      const cacheToSave = this.cache.slice(0, 100);
      await AsyncStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(cacheToSave));
    } catch (error) {
      console.error('Failed to save history cache:', error);
    }
  }

  /**
   * Load pending queue from AsyncStorage
   */
  private async loadPendingQueue(): Promise<void> {
    try {
      const pending = await AsyncStorage.getItem(PENDING_HISTORY_KEY);
      if (pending) {
        this.pendingQueue = JSON.parse(pending);
      }
    } catch (error) {
      console.error('Failed to load pending history queue:', error);
    }
  }

  /**
   * Save pending queue to AsyncStorage
   */
  private async savePendingQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(PENDING_HISTORY_KEY, JSON.stringify(this.pendingQueue));
    } catch (error) {
      console.error('Failed to save pending history queue:', error);
    }
  }

  /**
   * Clear cache (for testing/debugging)
   */
  async clearCache(): Promise<void> {
    this.cache = [];
    this.pendingQueue = [];
    await Promise.all([
      AsyncStorage.removeItem(HISTORY_CACHE_KEY),
      AsyncStorage.removeItem(PENDING_HISTORY_KEY),
    ]);
  }
}

const historyService = new HistoryService();
export default historyService;

