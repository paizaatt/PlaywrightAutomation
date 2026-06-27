import type { APIRequestContext, APIResponse } from '@playwright/test';

//lấy chính xác bộ khung (Options: chứa data, headers. params, timeout, ...)
export type ApiPostOption = Parameters<APIRequestContext['post']>[1];
export type ApiGetOption = Parameters<APIRequestContext['get']>[1];
export type ApiPutOption = Parameters<APIRequestContext['put']>[1];
export type ApiPatchOption = Parameters<APIRequestContext['patch']>[1];
export type ApiDeleteOption = Parameters<APIRequestContext['delete']>[1];

export abstract class BaseApiComponent {
  constructor(
    protected readonly request: APIRequestContext,
    protected readonly baseURL: string,
  ) {}

  protected resolveUrl(path: string): string {
    return new URL(path, this.baseURL).toString();
  }

  protected post(path: string, options?: ApiPostOption): Promise<APIResponse> {
    return this.request.post(this.resolveUrl(path), options);
  }

  protected get(path: string, options?: ApiGetOption): Promise<APIResponse> {
    return this.request.get(this.resolveUrl(path), options);
  }

  protected put(path: string, options?: ApiPutOption): Promise<APIResponse> {
    return this.request.put(this.resolveUrl(path), options);
  }

  protected patch(path: string, options?: ApiPatchOption): Promise<APIResponse> {
    return this.request.patch(this.resolveUrl(path), options);
  }

  protected delete(path: string, options?: ApiDeleteOption): Promise<APIResponse> {
    return this.request.delete(this.resolveUrl(path), options);
  }
}
