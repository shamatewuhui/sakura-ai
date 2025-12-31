// 🔥 使用标准 ES 模块导入 Prisma Client
import { PrismaClient } from '../../src/generated/prisma/index.js';

export interface DatabaseConfig {
  maxConnections?: number;
  connectionTimeoutMs?: number;
  enableLogging?: boolean;
  logLevel?: 'info' | 'query' | 'warn' | 'error';
}

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private prismaClient: PrismaClient;
  private config: DatabaseConfig;
  private isConnected: boolean = false;

  private constructor(config: DatabaseConfig = {}) {
    this.config = {
      maxConnections: 10,
      connectionTimeoutMs: 30000,
      enableLogging: false,
      logLevel: 'error',
      ...config
    };

    // 创建Prisma客户端，配置连接池和日志
    this.prismaClient = new PrismaClient({
      log: this.config.enableLogging ? [this.config.logLevel!] : [],
      // 连接池配置（在生产环境中会生效）
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    console.log(`🗄️ 数据库服务已初始化，配置:`, {
      maxConnections: this.config.maxConnections,
      enableLogging: this.config.enableLogging,
      logLevel: this.config.logLevel
    });
  }

  // 单例模式获取实例
  public static getInstance(config?: DatabaseConfig): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(config);
    }
    return DatabaseService.instance;
  }

  // 获取Prisma客户端
  public getClient(): PrismaClient {
    return this.prismaClient;
  }

  // 连接数据库
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      console.log(`🔌 正在连接数据库...`);
      
      // 测试连接
      await this.prismaClient.$connect();
      
      // 验证连接
      await this.prismaClient.$queryRaw`SELECT 1`;
      
      this.isConnected = true;
      console.log(`✅ 数据库连接成功`);
    } catch (error) {
      console.error(`❌ 数据库连接失败:`, error);
      throw new Error(`数据库连接失败: ${error.message}`);
    }
  }

  // 断开连接
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      console.log(`🔌 正在断开数据库连接...`);
      await this.prismaClient.$disconnect();
      this.isConnected = false;
      console.log(`✅ 数据库连接已断开`);
    } catch (error) {
      console.error(`⚠️ 断开数据库连接时出错:`, error);
    }
  }

  // 检查连接状态
  public async checkConnection(): Promise<boolean> {
    try {
      await this.prismaClient.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.warn(`⚠️ 数据库连接检查失败:`, error.message);
      this.isConnected = false;
      return false;
    }
  }

  // 获取连接统计信息
  public getStats(): { isConnected: boolean; config: DatabaseConfig } {
    return {
      isConnected: this.isConnected,
      config: { ...this.config }
    };
  }

  // 更新配置（注意：某些配置需要重新连接才能生效）
  public updateConfig(newConfig: Partial<DatabaseConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    console.log(`📋 数据库服务配置已更新:`, {
      从: oldConfig,
      到: this.config
    });

    // 如果日志配置改变，提醒用户重启服务
    if (oldConfig.enableLogging !== this.config.enableLogging || 
        oldConfig.logLevel !== this.config.logLevel) {
      console.warn(`⚠️ 日志配置已更改，需要重启服务才能生效`);
    }
  }

  // 健康检查（用于监控）
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    uptime: number;
    error?: string;
  }> {
    const startTime = process.hrtime();
    
    try {
      await this.prismaClient.$queryRaw`SELECT 1`;
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds / 1000000;

      return {
        status: 'healthy',
        uptime: responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        uptime: 0,
        error: error.message
      };
    }
  }

  // 执行事务
  public async executeTransaction<T>(
    operations: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await this.prismaClient.$transaction(async (tx) => {
      return operations(tx as PrismaClient);
    });
  }

  // 销毁实例（主要用于测试）
  public static async destroyInstance(): Promise<void> {
    if (DatabaseService.instance) {
      await DatabaseService.instance.disconnect();
      DatabaseService.instance = null;
      console.log(`💥 数据库服务实例已销毁`);
    }
  }
}