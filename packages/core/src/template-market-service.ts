import { templateService } from './template-service';
import { ProjectTemplate } from './template-service';

export interface TemplateRating {
  userId: string;
  templateId: string;
  rating: number;
  comment?: string;
  createdAt: number;
}

export interface TemplateDownload {
  userId: string;
  templateId: string;
  downloadedAt: number;
}

export class TemplateMarketService {
  private ratings = new Map<string, TemplateRating[]>();
  private downloads = new Map<string, TemplateDownload[]>();

  async searchTemplates(query: string, filters?: {
    category?: string;
    framework?: string;
    language?: string;
    sortBy?: 'downloads' | 'rating' | 'updated';
  }): Promise<ProjectTemplate[]> {
    const templates = templateService.getTemplates({ query, ...filters });
    return templates.map(template => ({
      ...template,
      downloads: this.getDownloadCount(template.id),
    }));
  }

  getTemplateById(templateId: string): ProjectTemplate | undefined {
    const template = templateService.getTemplateById(templateId);
    if (template) {
      return {
        ...template,
        downloads: this.getDownloadCount(templateId),
      };
    }
    return undefined;
  }

  async downloadTemplate(templateId: string, userId: string): Promise<boolean> {
    const template = templateService.getTemplateById(templateId);
    if (!template) {
      return false;
    }

    const download: TemplateDownload = {
      userId,
      templateId,
      downloadedAt: Date.now(),
    };

    const existingDownloads = this.downloads.get(templateId) || [];
    existingDownloads.push(download);
    this.downloads.set(templateId, existingDownloads);

    return true;
  }

  async rateTemplate(templateId: string, userId: string, rating: number, comment?: string): Promise<void> {
    const existingRatings = this.ratings.get(templateId) || [];
    const existingIndex = existingRatings.findIndex(r => r.userId === userId);

    const newRating: TemplateRating = {
      userId,
      templateId,
      rating,
      comment,
      createdAt: Date.now(),
    };

    if (existingIndex >= 0) {
      existingRatings[existingIndex] = newRating;
    } else {
      existingRatings.push(newRating);
    }

    this.ratings.set(templateId, existingRatings);
  }

  getTemplateRating(templateId: string): number {
    const ratings = this.ratings.get(templateId);
    if (!ratings || ratings.length === 0) {
      return 0;
    }
    return ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  }

  getDownloadCount(templateId: string): number {
    return this.downloads.get(templateId)?.length || 0;
  }

  async submitTemplate(template: Omit<ProjectTemplate, 'downloads' | 'stars' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newTemplate: ProjectTemplate = {
      ...template,
      downloads: 0,
      stars: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return newTemplate.id;
  }

  async getPopularTemplates(limit: number = 10): Promise<ProjectTemplate[]> {
    const templates = templateService.getTemplates();
    return templates
      .map(t => ({
        ...t,
        downloads: this.getDownloadCount(t.id),
      }))
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  async getNewTemplates(limit: number = 10): Promise<ProjectTemplate[]> {
    const templates = templateService.getTemplates({ sortBy: 'updated' });
    return templates.slice(0, limit);
  }
}

export const templateMarketService = new TemplateMarketService();