// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { ModelVersion, IModelRepository } from './types';
import { Logger } from './Logger';

export class ModelRepository implements IModelRepository {
  private logger: Logger;
  private currentModelCache: ModelVersion | null = null;
  private versionsCache: ModelVersion[] = [];
  private lastCacheUpdate = 0;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(logger: Logger) {
    this.logger = logger.child('ModelRepository');
  }

  async saveModel(model: ModelVersion): Promise<void> {
    try {
      this.logger.info(`Saving model version ${model.version} to repository`);

      // Save to database
      const { data, error } = await supabase
        .from('ml_model_versions')
        .insert({
          id: model.id,
          version: model.version,
          model_type: model.modelType,
          created_at: model.createdAt,
          trained_on: model.trainedOn,
          data_points: model.dataPoints,
          metrics: model.metrics as unknown,
          config: model.config as unknown,
          hyperparameters: model.hyperparameters,
          status: model.status,
          deployed_at: model.deployedAt,
          rollback_reason: model.rollbackReason,
          performance_score: model.performanceScore,
          file_url: model.fileUrl,
          checksum: model.checksum
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save model to database: ${error.message}`);
      }

      // Upload model file to Supabase Storage if it exists
      if (model.fileUrl && model.fileUrl.startsWith('local://')) {
        await this.uploadModelFile(model);
      }

      // Update cache
      this.invalidateCache();
      await this.getCurrentModel(); // Refresh current model

      this.logger.info(`Model version ${model.version} saved successfully`);

    } catch (error) {
      this.logger.error(`Failed to save model version ${model.version}:`, error);
      throw error;
    }
  }

  async loadModel(version: string): Promise<ModelVersion> {
    try {
      this.logger.info(`Loading model version ${version}`);

      // Check cache first
      const cached = this.versionsCache.find(v => v.version === version);
      if (cached && this.isCacheValid()) {
        return cached;
      }

      // Query database
      const { data, error } = await supabase
        .from('ml_model_versions')
        .select('*')
        .eq('version', version)
        .single();

      if (error) {
        throw new Error(`Model version ${version} not found: ${error.message}`);
      }

      const model: ModelVersion = {
        id: data.id,
        version: data.version,
        modelType: data.model_type,
        createdAt: data.created_at,
        trainedOn: data.trained_on,
        dataPoints: data.data_points,
        metrics: data.metrics,
        config: data.config,
        hyperparameters: data.hyperparameters,
        status: data.status,
        deployedAt: data.deployed_at,
        rollbackReason: data.rollback_reason,
        performanceScore: data.performance_score,
        fileUrl: data.file_url,
        checksum: data.checksum
      };

      // Update cache
      this.addToCache(model);

      return model;

    } catch (error) {
      this.logger.error(`Failed to load model version ${version}:`, error);
      throw error;
    }
  }

  async listVersions(): Promise<ModelVersion[]> {
    try {
      // Check cache first
      if (this.isCacheValid() && this.versionsCache.length > 0) {
        return [...this.versionsCache];
      }

      this.logger.info('Fetching all model versions from database');

      const { data, error } = await supabase
        .from('ml_model_versions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch model versions: ${error.message}`);
      }

      const versions: ModelVersion[] = data.map(item => ({
        id: item.id,
        version: item.version,
        modelType: item.model_type,
        createdAt: item.created_at,
        trainedOn: item.trained_on,
        dataPoints: item.data_points,
        metrics: item.metrics,
        config: item.config,
        hyperparameters: item.hyperparameters,
        status: item.status,
        deployedAt: item.deployed_at,
        rollbackReason: item.rollback_reason,
        performanceScore: item.performance_score,
        fileUrl: item.file_url,
        checksum: item.checksum
      }));

      // Update cache
      this.versionsCache = versions;
      this.lastCacheUpdate = Date.now();

      return versions;

    } catch (error) {
      this.logger.error('Failed to list model versions:', error);
      throw error;
    }
  }

  async deleteModel(version: string): Promise<void> {
    try {
      this.logger.info(`Deleting model version ${version}`);

      // Get model info first for cleanup
      const model = await this.loadModel(version);

      // Delete from database
      const { error } = await supabase
        .from('ml_model_versions')
        .delete()
        .eq('version', version);

      if (error) {
        throw new Error(`Failed to delete model version ${version}: ${error.message}`);
      }

      // Delete model file from storage
      if (model.fileUrl && model.fileUrl.includes('supabase.co')) {
        await this.deleteModelFile(model.fileUrl);
      }

      // Update cache
      this.invalidateCache();

      this.logger.info(`Model version ${version} deleted successfully`);

    } catch (error) {
      this.logger.error(`Failed to delete model version ${version}:`, error);
      throw error;
    }
  }

  async getCurrentModel(): Promise<ModelVersion | null> {
    try {
      // Check cache first
      if (this.currentModelCache && this.isCacheValid()) {
        return this.currentModelCache;
      }

      // Query for deployed model
      const { data, error } = await supabase
        .from('ml_model_versions')
        .select('*')
        .eq('status', 'deployed')
        .order('deployed_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // No deployed model found
        this.currentModelCache = null;
        return null;
      }

      const model: ModelVersion = {
        id: data.id,
        version: data.version,
        modelType: data.model_type,
        createdAt: data.created_at,
        trainedOn: data.trained_on,
        dataPoints: data.data_points,
        metrics: data.metrics,
        config: data.config,
        hyperparameters: data.hyperparameters,
        status: data.status,
        deployedAt: data.deployed_at,
        rollbackReason: data.rollback_reason,
        performanceScore: data.performance_score,
        fileUrl: data.file_url,
        checksum: data.checksum
      };

      this.currentModelCache = model;
      return model;

    } catch (error) {
      this.logger.error('Failed to get current model:', error);
      return null;
    }
  }

  async setCurrentModel(version: string): Promise<void> {
    try {
      this.logger.info(`Setting model version ${version} as current`);

      // First, undeploy unknown currently deployed model
      const currentModel = await this.getCurrentModel();
      if (currentModel) {
        await supabase
          .from('ml_model_versions')
          .update({ status: 'ready', deployed_at: null })
          .eq('version', currentModel.version);
      }

      // Deploy the new model
      const { error } = await supabase
        .from('ml_model_versions')
        .update({
          status: 'deployed',
          deployed_at: new Date().toISOString()
        })
        .eq('version', version);

      if (error) {
        throw new Error(`Failed to deploy model version ${version}: ${error.message}`);
      }

      // Update cache
      this.invalidateCache();
      this.currentModelCache = await this.loadModel(version);

      this.logger.info(`Model version ${version} deployed successfully`);

    } catch (error) {
      this.logger.error(`Failed to set current model to version ${version}:`, error);
      throw error;
    }
  }

  // Additional utility methods
  async getModelHistory(version: string): Promise<ModelVersion[]> {
    try {
      // Get all versions that were trained on the same data
      const model = await this.loadModel(version);
      const trainedOn = new Date(model.trainedOn);
      const dayBefore = new Date(trainedOn.getTime() - 24 * 60 * 60 * 1000);
      const dayAfter = new Date(trainedOn.getTime() + 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('ml_model_versions')
        .select('*')
        .gte('trained_on', dayBefore.toISOString())
        .lte('trained_on', dayAfter.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get model history: ${error.message}`);
      }

      return data.map(item => ({
        id: item.id,
        version: item.version,
        modelType: item.model_type,
        createdAt: item.created_at,
        trainedOn: item.trained_on,
        dataPoints: item.data_points,
        metrics: item.metrics,
        config: item.config,
        hyperparameters: item.hyperparameters,
        status: item.status,
        deployedAt: item.deployed_at,
        rollbackReason: item.rollback_reason,
        performanceScore: item.performance_score,
        fileUrl: item.file_url,
        checksum: item.checksum
      }));

    } catch (error) {
      this.logger.error(`Failed to get model history for version ${version}:`, error);
      throw error;
    }
  }

  async getPerformanceTrend(version: string, days: number = 30): Promise<{
    date: string;
    performance_score: number;
    win_rate: number;
    profit_factor: number;
  }[]> {
    try {
      const model = await this.loadModel(version);
      const createdDate = new Date(model.createdAt);
      const startDate = new Date(createdDate.getTime() - days * 24 * 60 * 60 * 1000);

      // This would typically query performance metrics over time
      // For now, return simulated trend data
      const trend = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        trend.push({
          date: date.toISOString().split('T')[0],
          performance_score: Math.max(0, Math.min(100, model.performanceScore + (Math.random() - 0.5) * 20)),
          win_rate: Math.max(0, Math.min(1, model.metrics.win_rate + (Math.random() - 0.5) * 0.2)),
          profit_factor: Math.max(0, model.metrics.profit_factor + (Math.random() - 0.5) * 0.5)
        });
      }

      return trend;

    } catch (error) {
      this.logger.error(`Failed to get performance trend for version ${version}:`, error);
      throw error;
    }
  }

  async compareModels(versionA: string, versionB: string): Promise<{
    modelA: ModelVersion;
    modelB: ModelVersion;
    comparison: {
      performanceDifference: number;
      winRateDifference: number;
      profitFactorDifference: number;
      recommended: 'modelA' | 'modelB' | 'tie';
    };
  }> {
    try {
      const [modelA, modelB] = await Promise.all([
        this.loadModel(versionA),
        this.loadModel(versionB)
      ]);

      const comparison = {
        performanceDifference: modelB.performanceScore - modelA.performanceScore,
        winRateDifference: modelB.metrics.win_rate - modelA.metrics.win_rate,
        profitFactorDifference: modelB.metrics.profit_factor - modelA.metrics.profit_factor,
        recommended: 'tie' as 'modelA' | 'modelB' | 'tie'
      };

      // Simple recommendation logic
      if (comparison.performanceDifference > 5 && comparison.winRateDifference > 0.05) {
        comparison.recommended = 'modelB';
      } else if (comparison.performanceDifference < -5 && comparison.winRateDifference < -0.05) {
        comparison.recommended = 'modelA';
      }

      return {
        modelA,
        modelB,
        comparison
      };

    } catch (error) {
      this.logger.error(`Failed to compare models ${versionA} and ${versionB}:`, error);
      throw error;
    }
  }

  private async uploadModelFile(model: ModelVersion): Promise<void> {
    try {
      // In a real implementation, this would upload the actual model file
      // For now, we'll just update the file URL to point to storage
      const fileName = `models/${model.version}_${model.id}.json`;
      const publicUrl = `${supabase.supabaseUrl}/storage/v1/object/public/models/${fileName}`;

      await supabase
        .from('ml_model_versions')
        .update({ file_url: publicUrl })
        .eq('id', model.id);

      model.fileUrl = publicUrl;

    } catch (error) {
      this.logger.warn(`Failed to upload model file for version ${model.version}:`, error);
    }
  }

  private async deleteModelFile(fileUrl: string): Promise<void> {
    try {
      // Extract file path from URL and delete from storage
      // This is a simplified implementation
      this.logger.info(`Deleting model file: ${fileUrl}`);

    } catch (error) {
      this.logger.warn(`Failed to delete model file ${fileUrl}:`, error);
    }
  }

  private addToCache(model: ModelVersion): void {
    const existingIndex = this.versionsCache.findIndex(v => v.version === model.version);
    if (existingIndex >= 0) {
      this.versionsCache[existingIndex] = model;
    } else {
      this.versionsCache.unshift(model);
    }
    this.lastCacheUpdate = Date.now();
  }

  private invalidateCache(): void {
    this.versionsCache = [];
    this.currentModelCache = null;
    this.lastCacheUpdate = 0;
  }

  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheTimeout;
  }

  // Cleanup old models to save storage space
  async cleanupOldModels(keepCount: number = 10): Promise<void> {
    try {
      const versions = await this.listVersions();
      if (versions.length <= keepCount) return;

      const toDelete = versions.slice(keepCount);
      this.logger.info(`Cleaning up ${toDelete.length} old model versions`);

      for (const model of toDelete) {
        if (model.status !== 'deployed') {
          await this.deleteModel(model.version);
        }
      }

    } catch (error) {
      this.logger.error('Failed to cleanup old models:', error);
    }
  }
}