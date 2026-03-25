import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'

export interface Evaluation {
  id: string
  title: string
  formType: string
  publishType: string
}

export interface EvaluationResults {
  evaluationId: string
  totalAnswers: number
  answers: Record<string, unknown>[]
}

export interface ListEvaluationsParams {
  formType?: string
  publishType?: 'active' | 'draft' | 'closed'
  limit?: number
}

/** Performance evaluations — list, view details, results, and pending evaluations. */
export class EvaluationsModule {
  constructor(
    private http: HttpClient,
    private config: ResolvedConfig,
  ) {}

  /** List all evaluations with optional filters by form type or publish status. */
  async list(params?: ListEvaluationsParams): Promise<Evaluation[]> {
    return this.http.getData('/private/poll/v1/evaluations', {
      limit: params?.limit ?? 20,
      formType: params?.formType,
      publishType: params?.publishType,
    })
  }

  /** Get evaluation details by ID. */
  async detail(evaluationId: string): Promise<Evaluation> {
    return this.http.getData(`/private/poll/v1/evaluations/${evaluationId}`)
  }

  /** Get aggregated results/answers for an evaluation. */
  async results(evaluationId: string): Promise<EvaluationResults> {
    return this.http.getData(
      `/private/poll/v1/form-answers/evaluations-results/${evaluationId}`,
    )
  }

  /** Get evaluations assigned to the authenticated employee. */
  async myEvaluations(params?: { search?: string; limit?: number }): Promise<Evaluation[]> {
    return this.http.getData('/private/poll/v1/evaluations/employees-all-forms', {
      limit: params?.limit ?? 20,
      orderType: 'desc',
      publishType: 'active',
      search: params?.search,
    })
  }

  /** Get evaluations pending the authenticated employee's response. */
  async pending(): Promise<Evaluation[]> {
    return this.http.getData('/private/poll/v1/entity-reference-evaluations')
  }
}
