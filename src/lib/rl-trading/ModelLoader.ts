// @ts-nocheck
import {
  RLModelConfig,
  ModelWeights,
  ModelMetadata,
  ModelCache,
  SupabaseStorageConfig,
  RLInferenceConfig
} from '../../types/rl-trading';
import { supabase } from '../../integrations/supabase/client';

/**
 * Model Loading and Validation System
 * Handles loading pretrained PPO/CPPO models from Supabase Storage
 * with caching, validation, and versioning support
 */
export class ModelLoader {
  private config: RLInferenceConfig;
  private storageConfig: SupabaseStorageConfig;
  private cache: Map<string, ModelCache> = new Map();
  private stats: {
    cacheHits: number;
    cacheMisses: number;
    loadErrors: number;
    validationFailures: number;
  } = {
    cacheHits: 0,
    cacheMisses: 0,
    loadErrors: 0,
    validationFailures: 0
  };

  constructor(config: RLInferenceConfig, storageConfig: SupabaseStorageConfig) {
    this.config = config;
    this.storageConfig = storageConfig;
    this.startCacheCleanup();
  }

  /**
   * Load model weights from Supabase Storage
   */
  public async loadModel(modelPath: string, version: string = 'latest'): Promise<ModelWeights> {
    try {
      const cacheKey = this.getCacheKey(modelPath, version);

      // Check cache first
      const cachedModel = this.cache.get(cacheKey);
      if (cachedModel && !this.isCacheExpired(cachedModel)) {
        this.stats.cacheHits++;
        cachedModel.accessCount++;
        cachedModel.lastAccessed = Date.now();
        return cachedModel.weights;
      }

      this.stats.cacheMisses++;

      // Load from Supabase Storage
      const modelData = await this.loadFromSupabase(modelPath, version);

      // Validate model
      const validation = await this.validateModel(modelData);
      if (!validation.isValid) {
        this.stats.validationFailures++;
        throw new Error(`Model validation failed: ${validation.error}`);
      }

      // Cache the model
      const modelCache: ModelCache = {
        key: cacheKey,
        weights: modelData,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
        size: this.calculateModelSize(modelData)
      };

      this.addToCache(modelCache);

      return modelData;
    } catch (error) {
      this.stats.loadErrors++;
      console.error('Error loading model:', error);
      throw error;
    }
  }

  /**
   * Load model from Supabase Storage
   */
  private async loadFromSupabase(modelPath: string, version: string): Promise<ModelWeights> {
    const fullPath = `${this.storageConfig.path}/${modelPath}/${version}/model.json`;

    try {
      const { data, error } = await supabase.storage
        .from(this.storageConfig.bucket)
        .download(fullPath);

      if (error) {
        throw new Error(`Failed to download model: ${error.message}`);
      }

      const modelText = await data.text();
      const modelData = JSON.parse(modelText);

      // Deserialize weights
      const weights: ModelWeights = {
        policyNet: this.deserializeWeights(modelData.policyNet),
        valueNet: this.deserializeWeights(modelData.valueNet),
        constraintNet: modelData.constraintNet ?
          this.deserializeWeights(modelData.constraintNet) : undefined,
        metadata: modelData.metadata
      };

      return weights;
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      throw error;
    }
  }

  /**
   * List available model versions
   */
  public async listModelVersions(modelPath: string): Promise<string[]> {
    try {
      const prefix = `${this.storageConfig.path}/${modelPath}/`;

      const { data, error } = await supabase.storage
        .from(this.storageConfig.bucket)
        .list(prefix);

      if (error) {
        throw new Error(`Failed to list models: ${error.message}`);
      }

      // Extract version names from folder names
      const versions = data
        .filter(item => item.name.endsWith('/'))
        .map(item => item.name.replace('/', ''))
        .filter(name => name !== '')
        .sort()
        .reverse();

      return versions;
    } catch (error) {
      console.error('Error listing model versions:', error);
      throw error;
    }
  }

  /**
   * Get latest model version
   */
  public async getLatestVersion(modelPath: string): Promise<string> {
    const versions = await this.listModelVersions(modelPath);
    return versions[0] || 'latest';
  }

  /**
   * Validate model structure and metadata
   */
  public async validateModel(model: ModelWeights): Promise<{
    isValid: boolean;
    error?: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    try {
      // Check required fields
      if (!model.policyNet || !model.valueNet) {
        return {
          isValid: false,
          error: 'Missing required network weights (policyNet or valueNet)',
          warnings
        };
      }

      // Check metadata
      if (!model.metadata) {
        warnings.push('Missing model metadata');
      } else {
        // Check version
        if (!model.metadata.version) {
          warnings.push('Missing model version');
        }

        // Check training date
        if (!model.metadata.trainingDate) {
          warnings.push('Missing training date');
        }

        // Check checksum
        if (!model.metadata.checksum) {
          warnings.push('Missing checksum validation');
        } else {
          const calculatedChecksum = this.calculateModelChecksum(model);
          if (calculatedChecksum !== model.metadata.checksum) {
            return {
              isValid: false,
              error: `Checksum mismatch: expected ${model.metadata.checksum}, got ${calculatedChecksum}`,
              warnings
            };
          }
        }
      }

      // Check network structure
      this.validateNetworkStructure(model.policyNet, 'policyNet', warnings);
      this.validateNetworkStructure(model.valueNet, 'valueNet', warnings);

      if (model.constraintNet) {
        this.validateNetworkStructure(model.constraintNet, 'constraintNet', warnings);
      }

      return { isValid: true, warnings };
    } catch (error) {
      return {
        isValid: false,
        error: `Validation error: ${error}`,
        warnings
      };
    }
  }

  /**
   * Validate network structure
   */
  private validateNetworkStructure(
    network: number[][][],
    name: string,
    warnings: string[]
  ): void {
    if (!Array.isArray(network) || network.length === 0) {
      warnings.push(`${name} network is empty or invalid`);
      return;
    }

    for (let i = 0; i < network.length; i++) {
      const layer = network[i];
      if (!Array.isArray(layer) || layer.length !== 2) {
        warnings.push(`${name} layer ${i} has invalid structure`);
        continue;
      }

      const [weights, biases] = layer;
      if (!Array.isArray(weights) || !Array.isArray(biases)) {
        warnings.push(`${name} layer ${i} has invalid weights or biases`);
        continue;
      }

      if (weights.length === 0 || biases.length === 0) {
        warnings.push(`${name} layer ${i} has empty weights or biases`);
      }
    }
  }

  /**
   * Calculate model checksum
   */
  private calculateModelChecksum(model: ModelWeights): string {
    const allNumbers: number[] = [];

    // Collect all weights
    const collectWeights = (network: number[][][]) => {
      network.forEach(layer => {
        layer.forEach(matrix => {
          allNumbers.push(...matrix);
        });
      });
    };

    collectWeights(model.policyNet);
    collectWeights(model.valueNet);
    if (model.constraintNet) {
      collectWeights(model.constraintNet);
    }

    // Simple checksum calculation
    const sum = allNumbers.reduce((acc, val) => acc + val, 0);
    const average = sum / allNumbers.length;
    const variance = allNumbers.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / allNumbers.length;

    return (sum + variance).toString(36).substring(0, 12);
  }

  /**
   * Add model to cache
   */
  private addToCache(modelCache: ModelCache): void {
    // Check cache size limit
    if (this.cache.size >= this.config.cacheSize) {
      this.evictFromCache();
    }

    this.cache.set(modelCache.key, modelCache);
  }

  /**
   * Evict oldest item from cache
   */
  private evictFromCache(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, cache] of this.cache.entries()) {
      if (cache.lastAccessed < oldestTime) {
        oldestTime = cache.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(cache: ModelCache): boolean {
    return Date.now() - cache.timestamp > this.config.cacheTTL;
  }

  /**
   * Get cache key
   */
  private getCacheKey(modelPath: string, version: string): string {
    return `${modelPath}:${version}`;
  }

  /**
   * Calculate model size in bytes
   */
  private calculateModelSize(model: ModelWeights): number {
    const countElements = (network: number[][][]) => {
      return network.reduce((total, layer) => {
        return total + layer[0].length + layer[1].length;
      }, 0);
    };

    let totalElements = countElements(model.policyNet) + countElements(model.valueNet);
    if (model.constraintNet) {
      totalElements += countElements(model.constraintNet);
    }

    return totalElements * 8; // 8 bytes per double
  }

  /**
   * Deserialize weights from array format
   */
  private deserializeWeights(weightsData: number[][][]): number[][][] {
    return weightsData.map(layer => [
      layer[0] || [], // weights
      layer[1] || []  // biases
    ]);
  }

  /**
   * Serialize weights to array format
   */
  public serializeWeights(weights: ModelWeights): unknown {
    return {
      policyNet: weights.policyNet,
      valueNet: weights.valueNet,
      constraintNet: weights.constraintNet,
      metadata: weights.metadata
    };
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    errors: number;
    validationFailures: number;
    cacheSize: number;
    totalCachedSize: number;
  } {
    const totalRequests = this.stats.cacheHits + this.stats.cacheMisses;
    const totalCachedSize = Array.from(this.cache.values())
      .reduce((sum, cache) => sum + cache.size, 0);

    return {
      hits: this.stats.cacheHits,
      misses: this.stats.cacheMisses,
      hitRate: totalRequests > 0 ? this.stats.cacheHits / totalRequests : 0,
      errors: this.stats.loadErrors,
      validationFailures: this.stats.validationFailures,
      cacheSize: this.cache.size,
      totalCachedSize
    };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached models
   */
  public getCachedModels(): ModelCache[] {
    return Array.from(this.cache.values());
  }

  /**
   * Remove specific model from cache
   */
  public removeFromCache(modelPath: string, version: string): boolean {
    const cacheKey = this.getCacheKey(modelPath, version);
    return this.cache.delete(cacheKey);
  }

  /**
   * Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCache();
    }, this.config.cacheTTL / 2); // Cleanup twice as often as TTL
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cache] of this.cache.entries()) {
      if (now - cache.timestamp > this.config.cacheTTL) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * Preload models into cache
   */
  public async preloadModels(modelPaths: string[]): Promise<void> {
    const promises = modelPaths.map(async (modelPath) => {
      try {
        const latestVersion = await this.getLatestVersion(modelPath);
        await this.loadModel(modelPath, latestVersion);
      } catch (error) {
        console.error(`Failed to preload model ${modelPath}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get model metadata without loading full weights
   */
  public async getModelMetadata(modelPath: string, version: string): Promise<ModelMetadata> {
    try {
      const fullPath = `${this.storageConfig.path}/${modelPath}/${version}/metadata.json`;

      const { data, error } = await supabase.storage
        .from(this.storageConfig.bucket)
        .download(fullPath);

      if (error) {
        throw new Error(`Failed to download metadata: ${error.message}`);
      }

      const metadataText = await data.text();
      return JSON.parse(metadataText);
    } catch (error) {
      console.error('Error loading metadata:', error);
      throw error;
    }
  }

  /**
   * Verify model integrity
   */
  public async verifyModelIntegrity(modelPath: string, version: string): Promise<{
    isValid: boolean;
    integrityScore: number;
    issues: string[];
  }> {
    try {
      const metadata = await this.getModelMetadata(modelPath, version);
      const model = await this.loadModel(modelPath, version);

      const issues: string[] = [];
      let integrityScore = 1.0;

      // Verify checksum
      const calculatedChecksum = this.calculateModelChecksum(model);
      if (calculatedChecksum !== metadata.checksum) {
        issues.push('Checksum mismatch detected');
        integrityScore -= 0.3;
      }

      // Verify training date
      const trainingAge = Date.now() - new Date(metadata.trainingDate).getTime();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (trainingAge > maxAge) {
        issues.push('Model is older than 30 days');
        integrityScore -= 0.1;
      }

      // Verify performance metrics
      if (metadata.sharpeRatio < 1.0) {
        issues.push('Low Sharpe ratio detected');
        integrityScore -= 0.2;
      }

      if (metadata.winRate < 0.5) {
        issues.push('Low win rate detected');
        integrityScore -= 0.2;
      }

      if (metadata.maxDrawdown > 0.2) {
        issues.push('High maximum drawdown detected');
        integrityScore -= 0.2;
      }

      return {
        isValid: integrityScore > 0.7,
        integrityScore: Math.max(0, integrityScore),
        issues
      };
    } catch (error) {
      return {
        isValid: false,
        integrityScore: 0,
        issues: [error.message || 'Unknown error']
      };
    }
  }

  /**
   * Get fallback model if available
   */
  public async getFallbackModel(): Promise<ModelWeights> {
    try {
      return await this.loadModel(this.config.fallbackModel, 'latest');
    } catch (error) {
      throw new Error(`Fallback model unavailable: ${error.message}`);
    }
  }
}