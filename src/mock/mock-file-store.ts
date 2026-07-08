import fs from 'fs';
import path from 'path';
import { mockLog } from './mock-logger';
import { getDefaultMockDataDir } from './mock-storage.config';

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export type MockSnapshot = {
  dtoName: string;
  updatedAt: string;
  source: 'jsf' | 'file';
  data: JsonValue;
};

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function resolveFilePath(dataDir: string, key: string): string {
  return path.join(dataDir, `${sanitizeKey(key)}.json`);
}

function ensureDataDir(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function readMockSnapshot(
  key: string,
  dataDir = getDefaultMockDataDir(),
): MockSnapshot | null {
  const filePath = resolveFilePath(dataDir, key);

  if (!fs.existsSync(filePath)) {
    mockLog('storage.read', `No saved mock file for "${key}"`, { filePath });
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as MockSnapshot;

  mockLog('storage.read', `Loaded mock from file for "${key}"`, {
    filePath,
    updatedAt: parsed.updatedAt,
    data: parsed.data,
  });

  return parsed;
}

export function writeMockSnapshot(
  key: string,
  data: JsonValue,
  dataDir = getDefaultMockDataDir(),
): MockSnapshot {
  ensureDataDir(dataDir);

  const snapshot: MockSnapshot = {
    dtoName: key,
    updatedAt: new Date().toISOString(),
    source: 'jsf',
    data,
  };

  const filePath = resolveFilePath(dataDir, key);
  fs.writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf-8');

  mockLog('storage.write', `Saved mock to file for "${key}"`, {
    filePath,
    snapshot,
  });

  return snapshot;
}

export function getMockFilePath(key: string, dataDir = getDefaultMockDataDir()): string {
  return resolveFilePath(dataDir, key);
}
