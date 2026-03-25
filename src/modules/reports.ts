import type { BiClient, BiQuery } from '../bi.js'
import type { ResolvedConfig } from '../config.js'

/** Valid primary tables for BI queries */
export const BI_TABLES = {
  employees: 'core_context_employee',
  checks: 'schedule_context_check',
  checkRequests: 'schedule_context_check_request',
  dayOffRequests: 'schedule_context_day_off_request',
  daysOff: 'schedule_context_day_off',
  contracts: 'contract_context_contract',
  hourStats: 'schedule_context_computed_hour_stat',
  calendars: 'schedule_context_calendar',
} as const

/** Temporal operations for WHERE clauses */
export const BI_TEMPORAL = {
  today: 'TODAY',
  yesterday: 'YESTERDAY',
  thisWeek: 'THIS_WEEK',
  thisMonth: 'THIS_MONTH',
  lastMonth: 'LAST_MONTH',
  thisYear: 'THIS_YEAR',
  lastYear: 'LAST_YEAR',
  last7Days: 'LAST_7_DAYS',
  last30Days: 'LAST_30_DAYS',
} as const

/** Raw BI query builder — run custom SQL-like queries against any Sesame BI table. Use BI_TABLES and BI_TEMPORAL constants. */
export class ReportsModule {
  constructor(
    private bi: BiClient,
    private config: ResolvedConfig,
  ) {}

  /** Execute a raw BI query. Use BI_TABLES for table names and BI_TEMPORAL for date operations. */
  async query<T = Record<string, unknown>>(query: BiQuery): Promise<T[]> {
    return this.bi.query<T>(query)
  }
}
