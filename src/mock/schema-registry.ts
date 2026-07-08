import openapiSpec from '../../schemas/api/openapi.json';
import schemaOverrides from '../../schemas/api/schema-overrides.json';
import { mockLog } from './mock-logger';

export type JsonSchemaObject = Record<string, unknown>;

type OpenApiSpec = {
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: { schemas?: Record<string, JsonSchemaObject> };
};

type OpenApiOperation = {
  requestBody?: { content?: Record<string, { schema?: JsonSchemaObject }> };
  responses?: Record<string, { content?: Record<string, { schema?: JsonSchemaObject }> }>;
};

export type OpenApiOperationContract = {
  method: string;
  path: string;
  hasJsonRequestBody: boolean;
  jsonResponseStatusCodes: number[];
};

type SchemaOverridesFile = {
  schemas?: Record<string, JsonSchemaObject>;
};

function isPlainObject(value: unknown): value is JsonSchemaObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(target: JsonSchemaObject, source: JsonSchemaObject): JsonSchemaObject {
  if (
    typeof source.$ref === 'string' ||
    typeof source.type === 'string' ||
    Array.isArray(source.type)
  ) {
    return { ...source };
  }

  const merged = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = deepMerge(merged[key] as JsonSchemaObject, value);
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** OpenAPI `example` → JSF-friendly `default` + `examples` */
export function enrichSchemaForJsf(schema: JsonSchemaObject): JsonSchemaObject {
  const enriched = cloneJson(schema);

  if (enriched.example !== undefined) {
    if (enriched.default === undefined) {
      enriched.default = enriched.example;
    }
    if (enriched.examples === undefined) {
      enriched.examples = [enriched.example];
    }
  }

  if (isPlainObject(enriched.properties)) {
    enriched.properties = Object.fromEntries(
      Object.entries(enriched.properties as Record<string, JsonSchemaObject>).map(([key, prop]) => [
        key,
        enrichSchemaForJsf(prop),
      ]),
    );
  }

  if (isPlainObject(enriched.items)) {
    enriched.items = enrichSchemaForJsf(enriched.items as JsonSchemaObject);
  }

  if (Array.isArray(enriched.allOf)) {
    enriched.allOf = enriched.allOf.map((item) =>
      isPlainObject(item) ? enrichSchemaForJsf(item) : item,
    );
  }

  return enriched;
}

export class SchemaRegistry {
  private readonly schemas: Record<string, JsonSchemaObject>;
  private readonly paths: OpenApiSpec['paths'];

  private constructor(schemas: Record<string, JsonSchemaObject>, paths: OpenApiSpec['paths']) {
    this.schemas = schemas;
    this.paths = paths;
  }

  static fromOpenApi(
    rawSpec: OpenApiSpec = openapiSpec as OpenApiSpec,
    overrides: SchemaOverridesFile = schemaOverrides as SchemaOverridesFile,
  ): SchemaRegistry {
    const spec = cloneJson(rawSpec);
    spec.components ??= {};
    spec.components.schemas ??= {};

    const overrideNames = Object.keys(overrides.schemas ?? {});
    for (const [name, override] of Object.entries(overrides.schemas ?? {})) {
      const base = spec.components.schemas[name] ?? {};
      spec.components.schemas[name] = deepMerge(base, override);
    }

    mockLog('registry.load', 'OpenAPI schema registry ready', {
      dtoCount: Object.keys(spec.components.schemas).length,
      pathCount: Object.keys(spec.paths).length,
      overridesApplied: overrideNames,
    });

    return new SchemaRegistry(spec.components.schemas, spec.paths);
  }

  hasDto(dtoName: string): boolean {
    return dtoName in this.schemas;
  }

  getDtoSchema(dtoName: string): JsonSchemaObject {
    const schema = this.schemas[dtoName];
    if (!schema) {
      const available = Object.keys(this.schemas).sort().join(', ');
      throw new Error(`DTO "${dtoName}" not found in schema registry. Available: ${available}`);
    }
    const enriched = enrichSchemaForJsf(cloneJson(schema));
    mockLog('registry.getDto', `Loaded DTO "${dtoName}"`, enriched);
    return enriched;
  }

  resolveRef(ref: string): JsonSchemaObject {
    const prefix = '#/components/schemas/';
    if (!ref.startsWith(prefix)) {
      throw new Error(`Unsupported $ref "${ref}". Expected prefix "${prefix}"`);
    }
    return this.getDtoSchema(ref.slice(prefix.length));
  }

  getOperationSchema(
    method: string,
    path: string,
    kind: 'request' | 'response',
    statusCode = 200,
  ): JsonSchemaObject {
    const operation = this.paths[path]?.[method.toLowerCase()];
    if (!operation) {
      throw new Error(`OpenAPI operation not found: ${method.toUpperCase()} ${path}`);
    }

    if (kind === 'request') {
      const schema = operation.requestBody?.content?.['application/json']?.schema;
      if (!schema) {
        throw new Error(`No requestBody schema for ${method.toUpperCase()} ${path}`);
      }
      return this.resolveSchemaNode(schema);
    }

    const schema = operation.responses?.[String(statusCode)]?.content?.['application/json']?.schema;
    if (!schema) {
      throw new Error(
        `No response schema for ${method.toUpperCase()} ${path} status ${statusCode}`,
      );
    }
    const resolved = this.resolveSchemaNode(schema);
    mockLog(
      'registry.getOperation',
      `Resolved ${kind} schema for ${method.toUpperCase()} ${path}`,
      {
        statusCode,
        schema: resolved,
      },
    );
    return resolved;
  }

  private resolveSchemaNode(schema: JsonSchemaObject): JsonSchemaObject {
    if (typeof schema.$ref === 'string') {
      return this.resolveRef(schema.$ref);
    }
    return enrichSchemaForJsf(cloneJson(schema));
  }

  createRefResolver(): (ref: string) => JsonSchemaObject {
    return (ref: string) => {
      if (ref.startsWith('#/components/schemas/')) {
        return this.resolveRef(ref);
      }
      throw new Error(`Cannot resolve ref "${ref}"`);
    };
  }

  listDtoNames(): string[] {
    return Object.keys(this.schemas).sort();
  }

  listOperationContracts(): OpenApiOperationContract[] {
    const contracts: OpenApiOperationContract[] = [];

    for (const [path, pathItem] of Object.entries(this.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        const hasJsonRequestBody = Boolean(
          operation.requestBody?.content?.['application/json']?.schema,
        );

        const jsonResponseStatusCodes = Object.entries(operation.responses ?? {})
          .filter(([, response]) => Boolean(response.content?.['application/json']?.schema))
          .map(([statusCode]) => Number(statusCode))
          .filter((statusCode) => Number.isInteger(statusCode))
          .sort((first, second) => first - second);

        if (!hasJsonRequestBody && jsonResponseStatusCodes.length === 0) {
          continue;
        }

        contracts.push({
          method: method.toUpperCase(),
          path,
          hasJsonRequestBody,
          jsonResponseStatusCodes,
        });
      }
    }

    return contracts.sort((first, second) =>
      `${first.path}:${first.method}`.localeCompare(`${second.path}:${second.method}`),
    );
  }
}
