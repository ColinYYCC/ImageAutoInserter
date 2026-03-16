import { dialog, systemPreferences } from 'electron';
import os from 'os';

/**
 * 检查并请求 macOS 文件访问权限
 * @returns 是否有权限
 */
export async function checkAndRequestFileAccess(): Promise<boolean> {
  // Windows 不需要特殊权限检查
  if (os.platform() !== 'darwin') {
    return true;
  }

  // macOS 12+ 需要检查文件访问权限
  if (systemPreferences.getMediaAccessStatus) {
    // 显示友好的提示
    const result = await dialog.showMessageBox({
      type: 'info',
      title: '权限说明',
      message: '首次使用需要文件访问权限',
      detail: '本应用需要访问您选择的 Excel 文件和图片文件夹。请在接下来的系统对话框中点击"允许"。',
      buttons: ['我知道了', '取消'],
      defaultId: 0,
    });

    if (result.response === 1) {
      return false;
    }
  }

  return true;
}

/**
 * 处理文件访问错误
 * @param error 错误对象
 * @returns 是否已处理
 */
export async function handleFileAccessError(error: Error): Promise<boolean> {
  const errorMessage = error.message.toLowerCase();
  
  // macOS 权限错误
  if (errorMessage.includes('permission denied') || 
      errorMessage.includes('eacces') ||
      errorMessage.includes('operation not permitted')) {
    
    await dialog.showMessageBox({
      type: 'warning',
      title: '无法访问文件',
      message: '没有权限访问该位置',
      detail: '请将文件复制到用户目录（如"文档"或"桌面"）后再试，或选择其他位置。',
      buttons: ['确定'],
    });
    
    return true;
  }
  
  // 文件不存在
  if (errorMessage.includes('enoent') || errorMessage.includes('no such file')) {
    await dialog.showMessageBox({
      type: 'error',
      title: '文件不存在',
      message: '找不到指定的文件',
      detail: '请检查文件路径是否正确，文件是否已被移动或删除。',
      buttons: ['确定'],
    });
    
    return true;
  }
  
  return false;
}

/**
 * 获取推荐的工作目录
 * @returns 推荐路径
 */
export function getRecommendedWorkingDir(): string {
  const homeDir = os.homedir();
  
  // 优先返回文档目录
  if (os.platform() === 'darwin') {
    return `${homeDir}/Documents`;
  }
  
  // Windows
  return `${homeDir}\\Documents`;
}
