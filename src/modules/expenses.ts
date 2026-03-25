import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'
import type { Paginated, PaginationParams } from '../types.js'

export interface Expense {
  id: string
  amount: number
  status: string
}

export interface ExpenseCategory {
  id: string
  name: string
  isDefault?: boolean
}

export interface ListExpensesParams extends PaginationParams {
  from?: string
  to?: string
  status?: 'pending' | 'accepted' | 'rejected' | 'pending_info' | 'personal'
}

/** Employee expenses — list personal/company expenses, view details, and get categories. */
export class ExpensesModule {
  constructor(
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  /** List the authenticated employee's expenses (paginated). Filter by date range or status. */
  async list(params?: ListExpensesParams): Promise<Paginated<Expense>> {
    return this.http.get('/api/v3/employee-expenses', {
      limit: params?.limit ?? 20,
      page: params?.page ?? 1,
      from: params?.from,
      to: params?.to,
      status: params?.status,
    })
  }

  /** Get expense details by ID. */
  async detail(expenseId: string): Promise<Expense> {
    return this.http.getData(`/api/v3/expenses/${expenseId}`)
  }

  /** Get available expense categories. */
  async categories(): Promise<ExpenseCategory[]> {
    return this.http.getData('/api/v3/expense-categories')
  }

  /** List all company expenses (admin). Optionally filter by employee, date range, or status. */
  async companyExpenses(
    params?: ListExpensesParams & { employeeId?: string },
  ): Promise<Paginated<Expense>> {
    return this.http.get('/api/v3/expenses', {
      limit: params?.limit ?? 20,
      page: params?.page ?? 1,
      from: params?.from,
      to: params?.to,
      status: params?.status,
      employeeId: params?.employeeId,
    })
  }
}
