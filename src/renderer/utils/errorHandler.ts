/**
 * 错误处理工具模块
 * 
 * 提供统一的错误提示处理，将技术错误转换为用户友好的提示信息
 */

/**
 * 错误类型枚举
 */
export enum ErrorType {
  // 文件相关错误
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_INVALID_FORMAT = 'FILE_INVALID_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_PERMISSION_DENIED = 'FILE_PERMISSION_DENIED',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  
  // Excel 相关错误
  EXCEL_MISSING_COLUMN = 'EXCEL_MISSING_COLUMN',
  EXCEL_EMPTY_FILE = 'EXCEL_EMPTY_FILE',
  EXCEL_CORRUPTED = 'EXCEL_CORRUPTED',
  EXCEL_NO_DATA_ROWS = 'EXCEL_NO_DATA_ROWS',
  
  // 图片相关错误
  IMAGE_SOURCE_EMPTY = 'IMAGE_SOURCE_EMPTY',
  IMAGE_NOT_FOUND = 'IMAGE_NOT_FOUND',
  IMAGE_FORMAT_UNSUPPORTED = 'IMAGE_FORMAT_UNSUPPORTED',
  
  // 系统相关错误
  API_NOT_AVAILABLE = 'API_NOT_AVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROCESS_ERROR = 'PROCESS_ERROR',
  PYTHON_NOT_FOUND = 'PYTHON_NOT_FOUND',
  
  // 未知错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 错误提示接口
 */
export interface ErrorInfo {
  type: ErrorType;
  title: string;
  message: string;
  resolution: string;
}

/**
 * 错误提示映射表
 */
const ERROR_MESSAGES: Record<ErrorType, ErrorInfo> = {
  // 文件相关错误
  [ErrorType.FILE_NOT_FOUND]: {
    type: ErrorType.FILE_NOT_FOUND,
    title: '文件不存在',
    message: '所选文件不存在或已被移动',
    resolution: '请确认文件路径是否正确，或重新选择文件。',
  },
  [ErrorType.FILE_INVALID_FORMAT]: {
    type: ErrorType.FILE_INVALID_FORMAT,
    title: '文件格式不支持',
    message: '所选文件格式不被支持',
    resolution: '请选择正确格式的文件：Excel 文件需为 .xlsx 格式，图片源需为文件夹或 ZIP/RAR/7Z 压缩包。',
  },
  [ErrorType.FILE_TOO_LARGE]: {
    type: ErrorType.FILE_TOO_LARGE,
    title: '文件过大',
    message: '所选文件大小超过限制（100MB）',
    resolution: '请选择较小的文件，或将文件拆分后重试。',
  },
  [ErrorType.FILE_PERMISSION_DENIED]: {
    type: ErrorType.FILE_PERMISSION_DENIED,
    title: '无法访问文件',
    message: '没有权限访问所选文件',
    resolution: '请检查文件权限设置，或尝试将文件复制到其他位置后重试。',
  },
  [ErrorType.FILE_READ_ERROR]: {
    type: ErrorType.FILE_READ_ERROR,
    title: '文件读取失败',
    message: '读取文件时发生错误',
    resolution: '请确认文件未被其他程序占用，或尝试重启应用程序。',
  },
  
  // Excel 相关错误
  [ErrorType.EXCEL_MISSING_COLUMN]: {
    type: ErrorType.EXCEL_MISSING_COLUMN,
    title: '表格缺少必填字段',
    message: '表格中未找到"商品编码"列',
    resolution: '请在表格中添加"商品编码"列。该列用于匹配商品图片，是必需的字段。',
  },
  [ErrorType.EXCEL_EMPTY_FILE]: {
    type: ErrorType.EXCEL_EMPTY_FILE,
    title: '表格为空',
    message: '所选 Excel 文件没有任何数据',
    resolution: '请选择包含商品数据的 Excel 文件。',
  },
  [ErrorType.EXCEL_CORRUPTED]: {
    type: ErrorType.EXCEL_CORRUPTED,
    title: '表格文件损坏',
    message: 'Excel 文件已损坏或格式不正确',
    resolution: '请尝试用 Excel 打开该文件检查是否正常，或选择其他文件。',
  },
  [ErrorType.EXCEL_NO_DATA_ROWS]: {
    type: ErrorType.EXCEL_NO_DATA_ROWS,
    title: '表格无数据行',
    message: '表格中未找到有效数据行',
    resolution: '请确保表格在"商品编码"列下方有数据内容。',
  },
  
  // 图片相关错误
  [ErrorType.IMAGE_SOURCE_EMPTY]: {
    type: ErrorType.IMAGE_SOURCE_EMPTY,
    title: '图片源为空',
    message: '所选文件夹或压缩包中没有图片文件',
    resolution: '请选择包含图片文件的文件夹或压缩包。支持格式：JPG、PNG、GIF、WEBP。',
  },
  [ErrorType.IMAGE_NOT_FOUND]: {
    type: ErrorType.IMAGE_NOT_FOUND,
    title: '图片未找到',
    message: '部分商品编码没有对应的图片',
    resolution: '请确保图片文件名包含商品编码。程序会自动匹配图片与商品。',
  },
  [ErrorType.IMAGE_FORMAT_UNSUPPORTED]: {
    type: ErrorType.IMAGE_FORMAT_UNSUPPORTED,
    title: '图片格式不支持',
    message: '存在不支持的图片格式',
    resolution: '请使用 JPG、PNG、GIF 或 WEBP 格式的图片。',
  },
  
  // 系统相关错误
  [ErrorType.API_NOT_AVAILABLE]: {
    type: ErrorType.API_NOT_AVAILABLE,
    title: '功能暂时不可用',
    message: '验证功能暂时不可用',
    resolution: '请重启应用程序后重试。如果问题持续，请联系技术支持。',
  },
  [ErrorType.NETWORK_ERROR]: {
    type: ErrorType.NETWORK_ERROR,
    title: '网络连接异常',
    message: '网络连接出现问题',
    resolution: '请检查网络连接后重试。',
  },
  [ErrorType.PROCESS_ERROR]: {
    type: ErrorType.PROCESS_ERROR,
    title: '处理过程出错',
    message: '处理过程中发生错误',
    resolution: '请重试。如果问题持续，请检查输入文件是否正确。',
  },
  [ErrorType.PYTHON_NOT_FOUND]: {
    type: ErrorType.PYTHON_NOT_FOUND,
    title: 'Python 环境未安装',
    message: '未找到 Python 运行环境',
    resolution: '请安装 Python 3.8 或更高版本，并确保已添加到系统 PATH 中。',
  },
  
  // 未知错误
  [ErrorType.UNKNOWN_ERROR]: {
    type: ErrorType.UNKNOWN_ERROR,
    title: '发生未知错误',
    message: '处理过程中发生未知错误',
    resolution: '请重试或重启应用程序。如果问题持续，请联系技术支持。',
  },
};

/**
 * 从错误字符串推断错误类型
 * 
 * @param errorStr 错误字符串
 * @returns 错误类型
 */
export function inferErrorType(errorStr: string): ErrorType {
  const lowerStr = errorStr.toLowerCase();
  
  // 文件相关
  if (lowerStr.includes('not found') || lowerStr.includes('不存在') || lowerStr.includes('enoent')) {
    return ErrorType.FILE_NOT_FOUND;
  }
  if (lowerStr.includes('permission') || lowerStr.includes('权限') || lowerStr.includes('eacces')) {
    return ErrorType.FILE_PERMISSION_DENIED;
  }
  if (lowerStr.includes('too large') || lowerStr.includes('过大') || lowerStr.includes('100mb')) {
    return ErrorType.FILE_TOO_LARGE;
  }
  if (lowerStr.includes('invalid format') || lowerStr.includes('不支持的文件类型') || lowerStr.includes('格式不支持')) {
    return ErrorType.FILE_INVALID_FORMAT;
  }
  
  // Excel 相关
  if (lowerStr.includes('缺少必填字段') || lowerStr.includes('商品编码')) {
    return ErrorType.EXCEL_MISSING_COLUMN;
  }
  if (lowerStr.includes('为空') || lowerStr.includes('empty')) {
    return ErrorType.EXCEL_EMPTY_FILE;
  }
  if (lowerStr.includes('corrupt') || lowerStr.includes('损坏') || lowerStr.includes('invalid excel')) {
    return ErrorType.EXCEL_CORRUPTED;
  }
  
  // 图片相关
  if (lowerStr.includes('没有图片') || lowerStr.includes('no image') || lowerStr.includes('图片源为空')) {
    return ErrorType.IMAGE_SOURCE_EMPTY;
  }
  
  // 系统相关
  if (lowerStr.includes('is not a function') || lowerStr.includes('api') || lowerStr.includes('不可用')) {
    return ErrorType.API_NOT_AVAILABLE;
  }
  if (lowerStr.includes('network') || lowerStr.includes('网络') || lowerStr.includes('econn')) {
    return ErrorType.NETWORK_ERROR;
  }
  if (lowerStr.includes('python') || lowerStr.includes('spawn')) {
    return ErrorType.PYTHON_NOT_FOUND;
  }
  
  return ErrorType.UNKNOWN_ERROR;
}

/**
 * 获取友好的错误提示
 * 
 * @param error 错误对象或错误字符串
 * @returns 错误提示信息
 */
export function getFriendlyError(error: unknown): ErrorInfo {
  const errorStr = error instanceof Error ? error.message : String(error);
  const errorType = inferErrorType(errorStr);
  return ERROR_MESSAGES[errorType];
}

/**
 * 获取指定类型的错误提示
 * 
 * @param type 错误类型
 * @returns 错误提示信息
 */
export function getErrorByType(type: ErrorType): ErrorInfo {
  return ERROR_MESSAGES[type];
}


