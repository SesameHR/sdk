import type { BiClient, BiWhereCondition, BiSelectField } from '../bi.js'
import type { ResolvedConfig } from '../config.js'
import type { BiFilterParams } from '../types.js'
import { employeeFilter } from '../types.js'

export interface Contract {
  status: string
  startDate: string
  endDate?: string
  weeklyHours: number
  fte: number
  remoteWork?: string
  seniorityDate?: string
  contractType?: string
  employeeName?: string
}

export interface ContractGroupCount {
  group: string
  count: number
}

export interface ListContractsParams extends BiFilterParams {
  status?: string
}

const BASE_SELECT: BiSelectField[] = [
  { field: 'contract_context_contract.status', alias: 'status' },
  { field: 'contract_context_contract.start_date', alias: 'startDate' },
  { field: 'contract_context_contract.end_date', alias: 'endDate' },
  { field: 'contract_context_contract.weekly_hours', alias: 'weeklyHours' },
  { field: 'contract_context_contract.fte', alias: 'fte' },
  { field: 'contract_context_contract.remote_work', alias: 'remoteWork' },
  { field: 'contract_context_contract.seniority_date', alias: 'seniorityDate' },
  { field: 'contract_context_contract_type.name', alias: 'contractType' },
  { field: 'core_context_employee.name', alias: 'employeeName' },
]

/** Employee contracts — list, filter by status, find expiring contracts, and get type/status breakdowns. */
export class ContractsModule {
  constructor(
    private bi: BiClient,
    private config: ResolvedConfig,
  ) {}

  /** List contracts with optional status filter. */
  async list(params?: ListContractsParams): Promise<Contract[]> {
    const where: BiWhereCondition[] = [...employeeFilter(params?.employee)]
    if (params?.status) {
      where.push({ field: 'contract_context_contract.status', operator: '=', value: params.status })
    }

    return this.bi.query<Contract>({
      from: 'contract_context_contract',
      select: BASE_SELECT,
      where,
      orderBy: [{ field: 'core_context_employee.name', direction: 'ASC' }],
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    })
  }

  /** List only active contracts. */
  async active(params?: BiFilterParams): Promise<Contract[]> {
    return this.list({ ...params, status: 'active' })
  }

  /** Find active contracts expiring within the next N days. */
  async expiringSoon(days: number, params?: BiFilterParams): Promise<Contract[]> {
    const today = new Date()
    const future = new Date(today.getTime() + days * 86400000)
    const todayStr = today.toISOString().slice(0, 10)
    const futureStr = future.toISOString().slice(0, 10)

    return this.bi.query<Contract>({
      from: 'contract_context_contract',
      select: BASE_SELECT,
      where: [
        ...employeeFilter(params?.employee),
        { field: 'contract_context_contract.status', operator: '=', value: 'active' },
        { field: 'contract_context_contract.end_date', operator: '>=', value: todayStr },
        { field: 'contract_context_contract.end_date', operator: '<=', value: futureStr },
      ],
      orderBy: [{ field: 'contract_context_contract.end_date', direction: 'ASC' }],
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    })
  }

  /** Count active contracts grouped by contract type. */
  async byType(params?: BiFilterParams): Promise<ContractGroupCount[]> {
    return this.bi.query<ContractGroupCount>({
      from: 'contract_context_contract',
      select: [
        { field: 'contract_context_contract_type.name', alias: 'group' },
        { field: 'contract_context_contract.status', aggregate: 'COUNT', alias: 'count' },
      ],
      where: [
        ...employeeFilter(params?.employee),
        { field: 'contract_context_contract.status', operator: '=', value: 'active' },
      ],
      groupBy: ['contract_context_contract_type.name'],
      orderBy: [{ field: 'count', direction: 'DESC' }],
      limit: params?.limit ?? 50,
    })
  }

  /** Count contracts grouped by status (active/terminated/previous). */
  async statusSummary(params?: BiFilterParams): Promise<ContractGroupCount[]> {
    return this.bi.query<ContractGroupCount>({
      from: 'contract_context_contract',
      select: [
        { field: 'contract_context_contract.status', alias: 'group' },
        { field: 'contract_context_contract.status', aggregate: 'COUNT', alias: 'count' },
      ],
      where: [...employeeFilter(params?.employee)],
      groupBy: ['contract_context_contract.status'],
      orderBy: [{ field: 'count', direction: 'DESC' }],
    })
  }
}
