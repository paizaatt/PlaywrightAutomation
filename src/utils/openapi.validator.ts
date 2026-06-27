import Ajv, { type AnySchema, type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import openapiSpec from '../../schemas/api/openapi.json';
import schemaOverrides from '../../schemas/api/schema-overrides.json';

const OPENAPI_ID = 'openapi-spec';

type JsonSchema = Record<string, unknown>;

type OpenApiOperation = {
  responses?: Record<string, { content?: Record<string, { schema?: JsonSchema }> }>;
  requestBody?: { content?: Record<string, { schema?: JsonSchema }> };
};

type OpenApiSpec = {
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: { schemas?: Record<string, JsonSchema> };
};

type SchemaOverrides = {
  schemas?: Record<string, JsonSchema>;
};

function isPlainObject(value: unknown): value is JsonSchema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(target: JsonSchema, source: JsonSchema): JsonSchema {
  const merged = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = deepMerge(merged[key] as JsonSchema, value);
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

function normalizeOpenApiSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeOpenApiSchema);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const schema: JsonSchema = { ...value };

  if (schema.nullable && typeof schema.type === 'string') {
    schema.type = [schema.type, 'null'];
    delete schema.nullable;
  }

  if (typeof schema.$ref === 'string' && schema.$ref.startsWith('#/components/schemas/')) {
    return { $ref: `${OPENAPI_ID}${schema.$ref}` };
  }

  for (const [key, nested] of Object.entries(schema)) {
    schema[key] = normalizeOpenApiSchema(nested);
  }

  return schema;
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) return 'Unknown schema validation error';

  return errors
    .map((error) => {
      const path = error.instancePath || '(root)';
      return `- ${path}: ${error.message ?? 'invalid'}`;
    })
    .join('\n');
}

function prepareSpec(raw: OpenApiSpec): OpenApiSpec & { $id: string } {
  const spec = JSON.parse(JSON.stringify(raw)) as OpenApiSpec & { $id: string };
  spec.$id = OPENAPI_ID;

  spec.components ??= {};
  spec.components.schemas ??= {};

  const overrides = (schemaOverrides as SchemaOverrides).schemas ?? {};
  for (const [name, override] of Object.entries(overrides)) {
    const base = spec.components.schemas![name] ?? {};
    spec.components.schemas![name] = deepMerge(base, override);
  }

  for (const name of Object.keys(spec.components.schemas)) {
    spec.components.schemas[name] = normalizeOpenApiSchema(
      spec.components.schemas[name],
    ) as JsonSchema;
  }

  return spec;
}

function collectSchemaRefs(value: unknown, refs = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaRefs(item, refs));
    return refs;
  }

  if (!isPlainObject(value)) {
    return refs;
  }

  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/components/schemas/')) {
    refs.add(value.$ref.replace('#/components/schemas/', ''));
  }

  for (const nested of Object.values(value)) {
    collectSchemaRefs(nested, refs);
  }

  return refs;
}

function logOpenApiDebug(context: {
  kind: 'request' | 'response';
  label: string;
  method: string;
  path: string;
  statusCode?: string;
  data: unknown;
  rawSchema: JsonSchema;
  compiledSchema: JsonSchema;
  referencedSchemas: Record<string, JsonSchema>;
  isValid: boolean;
  errors: ErrorObject[] | null | undefined;
}): void {
  const divider = '='.repeat(60);
  const schemaSource =
    context.kind === 'request'
      ? 'openapi.json (paths.requestBody)'
      : 'openapi.json (paths.responses)';

  console.log(`\n${divider}`);
  console.log(`[OpenAPI Debug] ${context.kind === 'request' ? 'Request' : 'Response'} validation`);
  console.log(divider);
  console.log('Operation:', context.label);
  console.log('Method:', context.method.toUpperCase());
  console.log('Path:', context.path);
  if (context.statusCode) {
    console.log('Status code:', context.statusCode);
  }
  console.log('Validation result:', context.isValid ? 'PASS' : 'FAIL');

  console.log(`\n--- 1. ${context.kind === 'request' ? 'Request' : 'Response'} body (data) ---`);
  console.log(JSON.stringify(context.data, null, 2));

  console.log(`\n--- 2. JSON Schema gốc từ ${schemaSource} ---`);
  console.log(JSON.stringify(context.rawSchema, null, 2));

  console.log('\n--- 3. JSON Schema sau normalize (AJV compile) ---');
  console.log(JSON.stringify(context.compiledSchema, null, 2));

  if (Object.keys(context.referencedSchemas).length > 0) {
    console.log('\n--- 4. Component schemas được $ref ---');
    console.log(JSON.stringify(context.referencedSchemas, null, 2));
  }

  if (!context.isValid && context.errors?.length) {
    console.log('\n--- 5. AJV validation errors ---');
    console.log(formatErrors(context.errors));
  }

  console.log(`${divider}\n`);
}

type SchemaValidationContext = {
  label: string;
  rawSchema: JsonSchema;
  compiledSchema: JsonSchema;
  referencedSchemas: Record<string, JsonSchema>;
  validate: ValidateFunction;
};

class OpenApiValidator {
  private readonly ajv: Ajv;
  private readonly spec: OpenApiSpec & { $id: string };
  private readonly validateCache = new Map<string, ValidateFunction>();
  private readonly responseContextCache = new Map<string, SchemaValidationContext>();
  private readonly requestContextCache = new Map<string, SchemaValidationContext>();

  constructor(rawSpec: OpenApiSpec) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
    this.spec = prepareSpec(rawSpec);
    this.ajv.addSchema(this.spec as AnySchema);
  }

  private getOperation(method: string, path: string): OpenApiOperation {
    const operation = this.spec.paths[path]?.[method.toLowerCase()];
    if (!operation) {
      throw new Error(`OpenAPI: ${method.toUpperCase()} ${path} not found`);
    }
    return operation;
  }

  private buildValidationContext(
    cacheKey: string,
    label: string,
    rawSchema: JsonSchema | undefined,
    missingSchemaMessage: string,
    contextCache: Map<string, SchemaValidationContext>,
  ): SchemaValidationContext {
    const cached = contextCache.get(cacheKey);
    if (cached) return cached;

    if (!rawSchema) {
      throw new Error(missingSchemaMessage);
    }

    const compiledSchema = normalizeOpenApiSchema(
      JSON.parse(JSON.stringify(rawSchema)),
    ) as JsonSchema;

    let validate = this.validateCache.get(cacheKey);
    if (!validate) {
      validate = this.ajv.compile(compiledSchema as AnySchema);
      this.validateCache.set(cacheKey, validate);
    }

    const refNames = [...collectSchemaRefs(rawSchema)];
    const referencedSchemas: Record<string, JsonSchema> = {};
    for (const name of refNames) {
      if (this.spec.components?.schemas?.[name]) {
        referencedSchemas[name] = this.spec.components.schemas[name];
      }
    }

    const context: SchemaValidationContext = {
      label,
      rawSchema,
      compiledSchema,
      referencedSchemas,
      validate,
    };

    contextCache.set(cacheKey, context);
    return context;
  }

  private resolveResponseValidation(
    method: string,
    path: string,
    statusCode: number | string,
  ): SchemaValidationContext {
    const code = String(statusCode);
    const cacheKey = `response:${method.toUpperCase()}:${path}:${code}`;
    const label = `${method.toUpperCase()} ${path} response (${code})`;
    const operation = this.getOperation(method, path);
    const rawSchema = operation.responses?.[code]?.content?.['application/json']?.schema;

    return this.buildValidationContext(
      cacheKey,
      label,
      rawSchema,
      `No JSON response schema for ${label}`,
      this.responseContextCache,
    );
  }

  private resolveRequestValidation(method: string, path: string): SchemaValidationContext {
    const cacheKey = `request:${method.toUpperCase()}:${path}`;
    const label = `${method.toUpperCase()} ${path} request body`;
    const operation = this.getOperation(method, path);
    const rawSchema = operation.requestBody?.content?.['application/json']?.schema;

    return this.buildValidationContext(
      cacheKey,
      label,
      rawSchema,
      `No JSON request body schema for ${label}. Endpoint này có thể không có requestBody trong openapi.json.`,
      this.requestContextCache,
    );
  }

  assertRequest(
    method: string,
    path: string,
    data: unknown,
    options?: { debug?: boolean },
  ): void {
    const context = this.resolveRequestValidation(method, path);
    const isValid = context.validate(data);

    if (options?.debug) {
      logOpenApiDebug({
        kind: 'request',
        label: context.label,
        method,
        path,
        data,
        rawSchema: context.rawSchema,
        compiledSchema: context.compiledSchema,
        referencedSchemas: context.referencedSchemas,
        isValid,
        errors: context.validate.errors,
      });
    }

    if (!isValid) {
      throw new Error(`${context.label} failed OpenAPI validation:\n${formatErrors(context.validate.errors)}`);
    }
  }

  assertResponse(
    method: string,
    path: string,
    statusCode: number | string,
    data: unknown,
    options?: { debug?: boolean },
  ): void {
    const code = String(statusCode);
    const context = this.resolveResponseValidation(method, path, statusCode);
    const isValid = context.validate(data);

    if (options?.debug) {
      logOpenApiDebug({
        kind: 'response',
        label: context.label,
        method,
        path,
        statusCode: code,
        data,
        rawSchema: context.rawSchema,
        compiledSchema: context.compiledSchema,
        referencedSchemas: context.referencedSchemas,
        isValid,
        errors: context.validate.errors,
      });
    }

    if (!isValid) {
      throw new Error(`${context.label} failed OpenAPI validation:\n${formatErrors(context.validate.errors)}`);
    }
  }
}

export type OpenApiAssertOptions = {
  /** In body, raw/compiled schema, $ref components và AJV errors */
  debug?: boolean;
};

const validator = new OpenApiValidator(openapiSpec as OpenApiSpec);

/** Validate request body theo requestBody schema trong openapi.json */
export function assertOpenApiRequest(
  method: string,
  path: string,
  data: unknown,
  options?: OpenApiAssertOptions,
): void {
  validator.assertRequest(method, path, data, options);
}

/** Validate response body theo schema trong openapi.json */
export function assertOpenApiResponse(
  method: string,
  path: string,
  data: unknown,
  statusCode = 200,
  options?: OpenApiAssertOptions,
): void {
  validator.assertResponse(method, path, statusCode, data, options);
}
