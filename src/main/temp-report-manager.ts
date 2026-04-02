/**
 * 临时报告管理模块（主进程）
 * 
 * 功能：
 * 1. 临时报告的创建、存储、访问
 * 2. 自动生命周期管理
 * 3. 清理机制
 * 4. 异常处理
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { logInfo, logError } from './logger';
import { safeWriteFile } from './utils/async-file';
import { getReportTempDirectory, getUserDataPath, getDesktopPath } from './path-config';

interface ReportMetadata {
  reportId: string;
  createdAt: string;
  status: 'temporary' | 'saved' | 'exported' | 'pending_cleanup';
  sessionId: string;
  filePath: string;
  sizeBytes: number;
  exported: boolean;
  viewed: boolean;
  viewCount: number;
  lastAccessed: string;
}

interface TempReportData {
  reportId: string;
  createdAt: string;
  sessionId: string;
  [key: string]: any;
}

interface CleanupResult {
  cleanedCount: number;
  errors: string[];
}

class TempReportManager {
  private static instance: TempReportManager;
  
  private baseDir: string;
  private tempDir: string;
  private savedDir: string;
  private currentSessionId: string;
  private currentReport: TempReportData | null = null;
  private currentMetadata: ReportMetadata | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.baseDir = getUserDataPath('report-manager');
    this.tempDir = getReportTempDirectory();
    this.savedDir = path.join(this.baseDir, 'saved-reports');
    this.currentSessionId = this.generateSessionId();
    
    this.ensureDirectories();
    this.startBackgroundCleanup();
    
    // 应用退出时清理
    app.on('will-quit', () => this.cleanupOnExit());
  }
  
  static getInstance(): TempReportManager {
    if (!TempReportManager.instance) {
      TempReportManager.instance = new TempReportManager();
    }
    return TempReportManager.instance;
  }
  
  private ensureDirectories(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    if (!fs.existsSync(this.savedDir)) {
      fs.mkdirSync(this.savedDir, { recursive: true });
    }
  }
  
  private generateSessionId(): string {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const random = Math.random().toString(36).slice(2, 8);
    return `session_${timestamp}_${random}`;
  }
  
  private generateReportId(): string {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const random = Math.random().toString(36).slice(2, 10);
    return `report_${timestamp}_${random}`;
  }
  
  /**
   * 创建临时报告
   */
  async createTempReport(reportData: Record<string, any>): Promise<string> {
    const reportId = this.generateReportId();
    const sessionDir = path.join(this.tempDir, this.currentSessionId);
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    const reportPath = path.join(sessionDir, 'report.json');
    const metadataPath = path.join(sessionDir, 'metadata.json');
    
    const fullReportData: TempReportData = {
      ...reportData,
      reportId,
      createdAt: new Date().toISOString(),
      sessionId: this.currentSessionId,
    };
    
    // 保存报告
    await safeWriteFile(reportPath, JSON.stringify(fullReportData, null, 2));

    // 创建元数据
    const stats = await fsPromises.stat(reportPath).catch(() => ({ size: 0 }));
    const metadata: ReportMetadata = {
      reportId,
      createdAt: new Date().toISOString(),
      status: 'temporary',
      sessionId: this.currentSessionId,
      filePath: reportPath,
      sizeBytes: stats.size,
      exported: false,
      viewed: false,
      viewCount: 0,
      lastAccessed: new Date().toISOString(),
    };

    safeWriteFile(metadataPath, JSON.stringify(metadata, null, 2)).catch(() => {});
    
    this.currentReport = fullReportData;
    this.currentMetadata = metadata;

    logInfo(`[TempReportManager] 创建临时报告: ${reportId}`);
    
    return reportId;
  }
  
  /**
   * 获取临时报告
   */
  getTempReport(reportId?: string): TempReportData | null {
    if (!reportId && this.currentReport) {
      return this.currentReport;
    }
    
    const sessions = fs.readdirSync(this.tempDir).filter(f => 
      f.startsWith('session_') && fs.statSync(path.join(this.tempDir, f)).isDirectory()
    );
    
    for (const session of sessions) {
      const metadataPath = path.join(this.tempDir, session, 'metadata.json');
      const reportPath = path.join(this.tempDir, session, 'report.json');
      
      if (fs.existsSync(metadataPath) && fs.existsSync(reportPath)) {
        const metadata: ReportMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        
        if (metadata.reportId === reportId) {
          const report: TempReportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
          
          // 更新访问记录
          metadata.viewed = true;
          metadata.viewCount++;
          metadata.lastAccessed = new Date().toISOString();
          safeWriteFile(metadataPath, JSON.stringify(metadata, null, 2)).catch(() => {});
          
          return report;
        }
      }
    }
    
    return null;
  }
  
  /**
   * 导出报告
   */
  async exportReport(outputPath?: string, reportId?: string): Promise<string> {
    const report = this.getTempReport(reportId);
    
    if (!report) {
      throw new Error('报告不存在');
    }
    
    if (!outputPath) {
      const desktop = getDesktopPath();
      outputPath = path.join(desktop, `error_report_${report.reportId}.json`);
    }
    
    await fsPromises.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    
    // 更新元数据
    this.updateMetadata(report.reportId, { exported: true, status: 'exported' });

    logInfo(`[TempReportManager] 导出报告: ${outputPath}`);
    
    return outputPath;
  }
  
  /**
   * 标记报告为待清理
   */
  markForCleanup(reportId?: string): void {
    if (!reportId && this.currentMetadata) {
      reportId = this.currentMetadata.reportId;
    }
    
    if (!reportId) return;
    
    const metadata = this.getMetadata(reportId);
    if (metadata && !metadata.exported) {
      this.updateMetadata(reportId, { status: 'pending_cleanup' });
      logInfo(`[TempReportManager] 标记报告待清理: ${reportId}`);
    }
  }
  
  /**
   * 清理临时报告
   */
  async cleanupTempReports(force: boolean = false): Promise<CleanupResult> {
    const result: CleanupResult = { cleanedCount: 0, errors: [] };
    
    const sessions = fs.readdirSync(this.tempDir).filter(f => 
      f.startsWith('session_') && fs.statSync(path.join(this.tempDir, f)).isDirectory()
    );
    
    for (const session of sessions) {
      const sessionPath = path.join(this.tempDir, session);
      const metadataPath = path.join(sessionPath, 'metadata.json');
      
      try {
        if (fs.existsSync(metadataPath)) {
          const metadata: ReportMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          
          const shouldClean = force || 
            (!metadata.exported && metadata.status === 'pending_cleanup');
          
          if (shouldClean) {
            await fsPromises.rm(sessionPath, { recursive: true, force: true });
            result.cleanedCount++;
            logInfo(`[TempReportManager] 清理报告: ${metadata.reportId}`);
          }
        } else {
          // 没有元数据的目录，检查创建时间
          const stat = fs.statSync(sessionPath);
          const createdTime = stat.birthtime;
          const hoursSinceCreated = (Date.now() - createdTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceCreated > 24) {
            await fsPromises.rm(sessionPath, { recursive: true, force: true });
            result.cleanedCount++;
            logInfo(`[TempReportManager] 清理过期目录: ${session}`);
          }
        }
      } catch (error) {
        result.errors.push(`清理 ${session} 失败: ${error}`);
        logError(`[TempReportManager] 清理失败: ${session}, 错误: ${error}`);
      }
    }
    
    return result;
  }
  
  /**
   * 获取元数据
   */
  private getMetadata(reportId: string): ReportMetadata | null {
    const sessions = fs.readdirSync(this.tempDir).filter(f => 
      f.startsWith('session_') && fs.statSync(path.join(this.tempDir, f)).isDirectory()
    );
    
    for (const session of sessions) {
      const metadataPath = path.join(this.tempDir, session, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        const metadata: ReportMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        if (metadata.reportId === reportId) {
          return metadata;
        }
      }
    }
    
    return null;
  }
  
  /**
   * 更新元数据
   */
  private updateMetadata(reportId: string, updates: Partial<ReportMetadata>): void {
    const sessions = fs.readdirSync(this.tempDir).filter(f => 
      f.startsWith('session_') && fs.statSync(path.join(this.tempDir, f)).isDirectory()
    );
    
    for (const session of sessions) {
      const metadataPath = path.join(this.tempDir, session, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        const metadata: ReportMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        
        if (metadata.reportId === reportId) {
          const updated = { ...metadata, ...updates };
          safeWriteFile(metadataPath, JSON.stringify(updated, null, 2)).catch(() => {});
          
          if (this.currentMetadata?.reportId === reportId) {
            this.currentMetadata = updated;
          }
          break;
        }
      }
    }
  }
  
  /**
   * 启动后台清理
   */
  private startBackgroundCleanup(): void {
    // 每 5 分钟执行一次清理检查
    this.cleanupTimer = setInterval(() => {
      this.cleanupTempReports(false).catch((err: Error) => {
        logError(`[TempReportManager] 后台清理出错: ${err.message}`);
      });
    }, 5 * 60 * 1000);
  }
  
  /**
   * 退出时清理
   */
  private cleanupOnExit(): void {
    logInfo('[TempReportManager] 应用退出，执行清理...');

    this.stopBackgroundCleanup();

    if (this.currentMetadata && !this.currentMetadata.exported) {
      this.markForCleanup(this.currentMetadata.reportId);
    }

    try {
      this.cleanupTempReports(false);
    } catch (error) {
      logError(`[TempReportManager] 退出清理失败: ${error}`);
    }
  }

  stopBackgroundCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      logInfo('[TempReportManager] 后台清理已停止');
    }
  }
  
  /**
   * 获取报告统计
   */
  getStatistics(): { tempCount: number; savedCount: number; totalSizeBytes: number } {
    let tempCount = 0;
    let savedCount = 0;
    let totalSizeBytes = 0;
    
    // 统计临时报告
    const sessions = fs.readdirSync(this.tempDir).filter(f => 
      f.startsWith('session_') && fs.statSync(path.join(this.tempDir, f)).isDirectory()
    );
    
    for (const session of sessions) {
      const metadataPath = path.join(this.tempDir, session, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadata: ReportMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        tempCount++;
        totalSizeBytes += metadata.sizeBytes;
      }
    }
    
    // 统计已保存报告
    const savedFiles = fs.readdirSync(this.savedDir).filter(f => f.endsWith('.json'));
    savedCount = savedFiles.length;
    
    for (const file of savedFiles) {
      totalSizeBytes += fs.statSync(path.join(this.savedDir, file)).size;
    }
    
    return { tempCount, savedCount, totalSizeBytes };
  }
}

export const tempReportManager = TempReportManager.getInstance();
