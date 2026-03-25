import type { ResolvedConfig } from './config.js'
import { SesameApiError, SesameConnectionError } from './errors.js'
import { withRetry } from './retry.js'

export class HttpClient {
  constructor(private config: ResolvedConfig) {}

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', path, undefined, params)
  }

  /** GET and unwrap { data: T } response */
  async getData<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.get<{ data: T }>(path, params)
    return response.data
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  /** POST and unwrap { data: T } response */
  async postData<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.post<{ data: T }>(path, body)
    return response.data
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const url = `${this.config.baseUrl}${path}`

    return withRetry(() => this.doFetch<T>(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: 'application/json',
      },
      body: formData,
    }))
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = this.buildUrl(path, params)

    return withRetry(() => this.doFetch<T>(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }))
  }

  private async doFetch<T>(url: string, init: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(this.config.timeout),
      })

      if (!response.ok) {
        throw new SesameApiError(response.status, await response.json().catch(() => null))
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof SesameApiError) throw error
      throw new SesameConnectionError((error as Error).message)
    }
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    let url = `${this.config.baseUrl}${path}`
    if (!params) return url

    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue
      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(`${key}[]`, String(item))
        }
      } else {
        searchParams.set(key, String(value))
      }
    }

    const qs = searchParams.toString()
    if (qs) url += `?${qs}`
    return url
  }
}
