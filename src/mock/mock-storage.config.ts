import path from 'path';

export type MockStorageMode = 'ram' | 'file';
export type MockFilePolicy = 'overwrite' | 'use-saved';

export type MockStorageConfig = {
  mode: MockStorageMode;
  filePolicy: MockFilePolicy;
  dataDir?: string;
};

const DEFAULT_MOCK_DATA_DIR = path.join(__dirname, '../../schemas/api/mock-data');

export function getDefaultMockDataDir(): string {
  return DEFAULT_MOCK_DATA_DIR;
}

/**
 * MOCK_STORAGE=ram|file          (default: ram — chỉ sinh trên RAM)
 * MOCK_FILE_POLICY=overwrite|use-saved  (default: overwrite khi mode=file)
 * MOCK_DATA_DIR=<path>           (optional — override thư mục lưu file)
 */
export function resolveMockStorageFromEnv(): MockStorageConfig {
  const mode: MockStorageMode = process.env.MOCK_STORAGE === 'file' ? 'file' : 'ram';
  const filePolicy: MockFilePolicy =
    process.env.MOCK_FILE_POLICY === 'use-saved' ? 'use-saved' : 'overwrite';

  const config: MockStorageConfig = { mode, filePolicy };

  if (process.env.MOCK_DATA_DIR) {
    config.dataDir = path.resolve(process.env.MOCK_DATA_DIR);
  }

  return config;
}

export function describeMockStorage(config: MockStorageConfig): string {
  if (config.mode === 'ram') {
    return 'RAM only (no file read/write)';
  }
  const policy =
    config.filePolicy === 'overwrite'
      ? 'generate + overwrite file with latest data'
      : 'read saved file (fallback to generate if missing)';
  return `FILE mode — ${policy}`;
}
