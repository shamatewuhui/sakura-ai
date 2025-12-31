/**
 * PDF.js 配置
 * 解决 worker 文件加载问题
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 配置 PDF.js worker
 * 使用本地的 worker 文件而不是从 CDN 加载
 */
export function configurePdfWorker() {
  try {
    // 动态导入 pdfjs-dist
    import('pdfjs-dist').then((pdfjsLib) => {
      // 设置 worker 路径为本地 node_modules 中的文件
      const workerPath = join(
        process.cwd(),
        'node_modules',
        'pdfjs-dist',
        'build',
        'pdf.worker.min.js'
      );
      
      // 使用 file:// 协议指向本地文件
      pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
      
      console.log('✅ PDF.js worker 已配置为使用本地文件');
      console.log(`   Worker 路径: ${workerPath}`);
    }).catch((error) => {
      console.warn('⚠️ 配置 PDF.js worker 失败:', error.message);
      console.warn('   PDF 解析功能可能无法正常工作');
    });
  } catch (error: any) {
    console.warn('⚠️ 配置 PDF.js worker 失败:', error.message);
  }
}



