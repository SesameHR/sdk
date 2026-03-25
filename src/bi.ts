import type { ResolvedConfig } from './config.js'
import { SesameApiError, SesameConnectionError } from './errors.js'
import { withRetry } from './retry.js'

export interface BiSelectField {
  field: string
  aggregate?: string | null
  alias?: string | null
  format?: string | null
}

export interface BiWhereCondition {
  field: string
  operation?: string
  operator?: string
  value?: string | number | boolean | string[]
}

export interface BiOrderBy {
  field: string
  direction?: 'ASC' | 'DESC'
}

export interface BiQuery {
  from: string
  select: BiSelectField[]
  where?: BiWhereCondition[]
  groupBy?: string[]
  orderBy?: BiOrderBy[]
  limit?: number
  offset?: number
}

export class BiClient {
  constructor(private config: ResolvedConfig) {}

  async query<T = Record<string, unknown>>(query: BiQuery): Promise<T[]> {
    const url = `${this.config.biBaseUrl}/analytics/report-query`
    const body = this.buildBody(query)

    return withRetry(() => this.doFetch<T[]>(url, body))
  }

  private buildBody(query: BiQuery): Record<string, unknown> {
    return {
      from: query.from,
      select: query.select.map((s) => ({
        field: s.field,
        aggregate: s.aggregate ?? null,
        alias: s.alias ?? null,
        placeholder: null,
        format: s.format ?? null,
      })),
      where: (query.where ?? []).map((w) => {
        const normalized: Record<string, unknown> = { field: w.field }
        if (w.operation) normalized.operation = w.operation
        if (w.operator) {
          normalized.operator = w.operator
          if (w.value !== undefined) normalized.value = w.value
        }
        return normalized
      }),
      group_by: query.groupBy ?? [],
      order_by: (query.orderBy ?? []).map((o) => ({
        field: o.field,
        direction: o.direction ?? 'ASC',
      })),
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
      periodicity: null,
      period_from: null,
      period_to: null,
    }
  }

  private async doFetch<T>(url: string, body: Record<string, unknown>): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.token}`,
          'x-company-id': this.config.companyId,
          'X-Region': this.config.region,
        },
        body: JSON.stringify(body),
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
}
