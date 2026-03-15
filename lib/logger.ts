import fs from 'fs/promises';
import path from 'path';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, any>;
  ip?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
}

export class Logger {
  private baseDir: string;
  private isServerless: boolean;

  constructor(baseDir: string = './logs') {
    this.baseDir = baseDir;
    this.isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  }

  private async ensureLogDirectory(): Promise<string> {
    if (this.isServerless) {
      return '/tmp/logs';
    }

    const now = new Date();
    const utc7Offset = 7 * 60;
    const localTime = new Date(now.getTime() + utc7Offset * 60 * 1000);
    
    const year = localTime.getUTCFullYear();
    const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localTime.getUTCDate()).padStart(2, '0');
    
    const logDir = path.join(this.baseDir, String(year), month, day);
    
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
    
    return logDir;
  }

  private getDateString(): string {
    const now = new Date();
    const utc7Offset = 7 * 60;
    const localTime = new Date(now.getTime() + utc7Offset * 60 * 1000);
    
    const year = localTime.getUTCFullYear();
    const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localTime.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  private async getLogFilePath(): Promise<string> {
    const logDir = await this.ensureLogDirectory();
    const dateStr = this.getDateString();
    const maxSize = 1024 * 1024;
    
    let fileIndex = 1;
    let logFile = path.join(logDir, `${dateStr}.log`);
    
    try {
      const stats = await fs.stat(logFile);
      
      if (stats.size >= maxSize) {
        while (true) {
          logFile = path.join(logDir, `${dateStr}.${fileIndex}.log`);
          try {
            const rotatedStats = await fs.stat(logFile);
            if (rotatedStats.size < maxSize) {
              break;
            }
            fileIndex++;
          } catch {
            break;
          }
        }
      }
    } catch {
      // File doesn't exist, use the base filename
    }
    
    return logFile;
  }

  private getTimestamp(): string {
    const now = new Date();
    const utc7Offset = 7 * 60;
    const localTime = new Date(now.getTime() + utc7Offset * 60 * 1000);
    
    const year = localTime.getUTCFullYear();
    const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localTime.getUTCDate()).padStart(2, '0');
    
    let hours = localTime.getUTCHours();
    const minutes = String(localTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(localTime.getUTCSeconds()).padStart(2, '0');
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hoursStr}:${minutes}:${seconds} ${ampm}`;
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (this.isServerless) {
      console.log(JSON.stringify(entry));
      return;
    }

    try {
      const logFile = await this.getLogFilePath();
      const logLine = JSON.stringify(entry) + '\n';
      
      await fs.appendFile(logFile, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write log:', error);
      console.log(JSON.stringify(entry));
    }
  }

  async info(message: string, data?: Record<string, any>): Promise<void> {
    await this.writeLog({
      timestamp: this.getTimestamp(),
      level: LogLevel.INFO,
      message,
      data,
    });
  }

  async warn(message: string, data?: Record<string, any>): Promise<void> {
    await this.writeLog({
      timestamp: this.getTimestamp(),
      level: LogLevel.WARN,
      message,
      data,
    });
  }

  async error(message: string, data?: Record<string, any>): Promise<void> {
    await this.writeLog({
      timestamp: this.getTimestamp(),
      level: LogLevel.ERROR,
      message,
      data,
    });
  }

  async debug(message: string, data?: Record<string, any>): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      await this.writeLog({
        timestamp: this.getTimestamp(),
        level: LogLevel.DEBUG,
        message,
        data,
      });
    }
  }

  async logRequest(
    method: string,
    path: string,
    ip: string,
    statusCode: number,
    duration: number,
    data?: Record<string, any>
  ): Promise<void> {
    await this.writeLog({
      timestamp: this.getTimestamp(),
      level: LogLevel.INFO,
      message: 'API Request',
      method,
      path,
      ip,
      statusCode,
      duration,
      data,
    });
  }

  async cleanupOldLogs(retentionDays: number = 7): Promise<void> {
    try {
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
      
      const years = await fs.readdir(this.baseDir);
      
      for (const year of years) {
        const yearPath = path.join(this.baseDir, year);
        const yearStat = await fs.stat(yearPath);
        
        if (!yearStat.isDirectory()) continue;
        
        const months = await fs.readdir(yearPath);
        
        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const monthStat = await fs.stat(monthPath);
          
          if (!monthStat.isDirectory()) continue;
          
          const days = await fs.readdir(monthPath);
          
          for (const day of days) {
            const dayPath = path.join(monthPath, day);
            const dayStat = await fs.stat(dayPath);
            
            if (!dayStat.isDirectory()) continue;
            
            const age = now - dayStat.mtimeMs;
            
            if (age > retentionMs) {
              await fs.rm(dayPath, { recursive: true, force: true });
              console.log(`Cleaned up old logs: ${dayPath}`);
            }
          }
          
          const remainingDays = await fs.readdir(monthPath);
          if (remainingDays.length === 0) {
            await fs.rmdir(monthPath);
          }
        }
        
        const remainingMonths = await fs.readdir(yearPath);
        if (remainingMonths.length === 0) {
          await fs.rmdir(yearPath);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

const baseDir = path.join(process.cwd(), 'logs');
export const logger = new Logger(baseDir);
