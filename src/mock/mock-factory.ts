import { faker } from '@faker-js/faker';
import type { GenerateOptions, JsonSchema } from 'json-schema-faker';
import { readMockSnapshot, writeMockSnapshot } from './mock-file-store';
import { mockLog } from './mock-logger';
import {
  describeMockStorage,
  getDefaultMockDataDir,
  type MockStorageConfig,
} from './mock-storage.config';
import { SchemaRegistry, type JsonSchemaObject as RegistrySchema } from './schema-registry';

export type MockGenerateOptions = {
  seed?: number;
  storage?: MockStorageConfig;
};

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsfModule = typeof import('json-schema-faker');

let jsfModulePromise: Promise<JsfModule> | undefined;

function loadJsonSchemaFaker(): Promise<JsfModule> {
  jsfModulePromise ??= import('json-schema-faker');
  return jsfModulePromise;
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isPlainObject(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}

function mergeWhenObject<T>(base: JsonValue, overrides?: Partial<T>): JsonValue {
  if (!overrides) return base;

  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    throw new Error('Overrides can only be applied to generated JSON objects');
  }

  return deepMergeOverrides(base, overrides as Partial<JsonObject>);
}

function deepMergeOverrides<T extends JsonObject>(base: T, overrides: Partial<T>): T {
  const merged = { ...base } as T;

  for (const [key, value] of Object.entries(overrides) as [keyof T, T[keyof T]][]) {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = deepMergeOverrides(
        merged[key] as JsonObject,
        value as Partial<JsonObject>,
      ) as T[keyof T];
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

function buildDefaultJsfOptions(registry: SchemaRegistry): GenerateOptions {
  return {
    useExamplesValue: true,
    useDefaultValue: true,
    alwaysFakeOptionals: true,
    fillProperties: true,
    optionalsProbability: 1,
    extensions: { faker },
    refResolver: (ref: string) => Promise.resolve(registry.createRefResolver()(ref)),
    outputTransform: (value, schema, path) => {
      if (isPlainObject(schema) && schema.example !== undefined && path.endsWith('/')) {
        return schema.example;
      }
      return value;
    },
  };
}

function buildOperationStorageKey(
  method: string,
  path: string,
  kind: 'request' | 'response',
  statusCode: number,
): string {
  const slug = path.replace(/^\//, '').replace(/\//g, '-').replace(/[{}]/g, '');
  return `${method.toLowerCase()}-${slug}-${kind}-${statusCode}`;
}

export class MockFactory {
  private readonly registry: SchemaRegistry;
  private readonly baseOptions: GenerateOptions;
  private readonly storageConfig: MockStorageConfig;

  private constructor(registry: SchemaRegistry, options?: MockGenerateOptions) {
    this.registry = registry;
    this.storageConfig = options?.storage ?? { mode: 'ram', filePolicy: 'overwrite' };
    this.baseOptions = {
      ...buildDefaultJsfOptions(registry),
      ...(options?.seed !== undefined ? { seed: options.seed } : {}),
    };

    mockLog('factory.create', 'MockFactory initialized', {
      availableDtos: registry.listDtoNames().length,
      seed: options?.seed ?? 'random',
      storage: describeMockStorage(this.storageConfig),
      dataDir: this.storageConfig.dataDir ?? getDefaultMockDataDir(),
    });
  }

  static create(options?: MockGenerateOptions): MockFactory {
    mockLog('factory.create', 'Loading OpenAPI schema registry...');
    return new MockFactory(SchemaRegistry.fromOpenApi(), options);
  }

  getStorageConfig(): MockStorageConfig {
    return this.storageConfig;
  }

  /** Generate mock data for a DTO in components.schemas (e.g. AuthResponseDto) */
  async generate<T>(dtoName: string, overrides?: Partial<T>): Promise<T> {
    mockLog('factory.generate', `Start generate for DTO "${dtoName}"`, {
      overrides,
      storage: this.storageConfig,
    });

    const dataDir = this.storageConfig.dataDir ?? getDefaultMockDataDir();

    if (this.storageConfig.mode === 'file' && this.storageConfig.filePolicy === 'use-saved') {
      const saved = readMockSnapshot(dtoName, dataDir);
      if (saved) {
        const merged = mergeWhenObject(saved.data, overrides);
        mockLog('factory.generate', `Using saved mock file for "${dtoName}"`, merged);
        return merged as T;
      }
      mockLog('factory.generate', `Saved file missing for "${dtoName}" — fallback to JSF generate`);
    }

    const schema = this.registry.getDtoSchema(dtoName);
    mockLog('factory.generate', `Resolved schema for "${dtoName}"`, schema);

    const generated = await this.generateFromSchema(schema, dtoName);
    mockLog('factory.generate', `JSF raw output for "${dtoName}"`, generated);

    const merged = mergeWhenObject(generated, overrides);

    if (overrides) {
      mockLog('factory.generate', `Applied overrides for "${dtoName}"`, { overrides, merged });
    }

    if (this.storageConfig.mode === 'file' && this.storageConfig.filePolicy === 'overwrite') {
      writeMockSnapshot(dtoName, merged, dataDir);
    }

    mockLog('factory.generate', `Final mock data for "${dtoName}"`, merged);
    return merged as T;
  }

  /** Generate from OpenAPI operation request/response schema */
  async generateForOperation<T>(
    method: string,
    path: string,
    kind: 'request' | 'response',
    overrides?: Partial<T>,
    statusCode = 200,
  ): Promise<T> {
    const storageKey = buildOperationStorageKey(method, path, kind, statusCode);

    mockLog('factory.generateForOperation', `Start generate for ${method.toUpperCase()} ${path}`, {
      kind,
      statusCode,
      overrides,
      storageKey,
      storage: this.storageConfig,
    });

    const dataDir = this.storageConfig.dataDir ?? getDefaultMockDataDir();

    if (this.storageConfig.mode === 'file' && this.storageConfig.filePolicy === 'use-saved') {
      const saved = readMockSnapshot(storageKey, dataDir);
      if (saved) {
        const merged = mergeWhenObject(saved.data, overrides);
        mockLog(
          'factory.generateForOperation',
          `Using saved mock file for "${storageKey}"`,
          merged,
        );
        return merged as T;
      }
    }

    const schema = this.registry.getOperationSchema(method, path, kind, statusCode);
    mockLog('factory.generateForOperation', `Resolved ${kind} schema`, schema);

    const generated = await this.generateFromSchema(schema, storageKey);
    const merged = mergeWhenObject(generated, overrides);

    if (this.storageConfig.mode === 'file' && this.storageConfig.filePolicy === 'overwrite') {
      writeMockSnapshot(storageKey, merged, dataDir);
    }

    mockLog('factory.generateForOperation', 'Final mock data', merged);
    return merged as T;
  }

  listAvailableDtos(): string[] {
    return this.registry.listDtoNames();
  }

  private async generateFromSchema(schema: RegistrySchema, label: string): Promise<JsonValue> {
    mockLog('factory.jsf', `Loading json-schema-faker for "${label}"`);
    const { createGenerator } = await loadJsonSchemaFaker();
    const generator = createGenerator(this.baseOptions);
    mockLog('factory.jsf', `Generating data via JSF + Faker for "${label}"`);
    const result = await generator.generate(schema as JsonSchema);
    if (!isJsonValue(result)) {
      throw new Error('Generated mock is not valid JSON data');
    }
    return result;
  }
}
