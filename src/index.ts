import type { SesameConfig, SesameCredentials } from './config.js'
import type { LoginParams, LoginResult } from './auth.js'
import type { AutoLoginParams, AutoLoginResult } from './autologin.js'
import { resolveConfig, configFromCredentials } from './config.js'
import { directLogin } from './auth.js'
import { verifyAutoLoginToken } from './autologin.js'
import { HttpClient } from './http.js'
import { BiClient } from './bi.js'
import { EmployeesModule } from './modules/employees.js'
import { ChecksModule } from './modules/checks.js'
import { VacationsModule } from './modules/vacations.js'
import { WorkStatsModule } from './modules/work-stats.js'
import { EvaluationsModule } from './modules/evaluations.js'
import { DocumentsModule } from './modules/documents.js'
import { ExpensesModule } from './modules/expenses.js'
import { AnnouncementsModule } from './modules/announcements.js'
import { JobChargesModule } from './modules/job-charges.js'
import { RecruitmentModule } from './modules/recruitment.js'
import { TeamModule } from './modules/team.js'
import { ReportsModule } from './modules/reports.js'
import { ContractsModule } from './modules/contracts.js'
import { NotificationsModule } from './modules/notifications.js'

export class SesameSDK {
  readonly employees: EmployeesModule
  readonly checks: ChecksModule
  readonly vacations: VacationsModule
  readonly workStats: WorkStatsModule
  readonly evaluations: EvaluationsModule
  readonly documents: DocumentsModule
  readonly expenses: ExpensesModule
  readonly announcements: AnnouncementsModule
  readonly jobCharges: JobChargesModule
  readonly recruitment: RecruitmentModule
  readonly team: TeamModule
  readonly reports: ReportsModule
  readonly contracts: ContractsModule
  readonly notifications: NotificationsModule

  constructor(config: SesameConfig) {
    const resolved = resolveConfig(config)
    const http = new HttpClient(resolved)
    const bi = new BiClient(resolved)

    this.employees = new EmployeesModule(bi, http, resolved)
    this.checks = new ChecksModule(bi, http, resolved)
    this.vacations = new VacationsModule(bi, http, resolved)
    this.workStats = new WorkStatsModule(http, resolved)
    this.evaluations = new EvaluationsModule(http, resolved)
    this.documents = new DocumentsModule(http, resolved)
    this.expenses = new ExpensesModule(http, resolved)
    this.announcements = new AnnouncementsModule(http, resolved)
    this.jobCharges = new JobChargesModule(http, resolved)
    this.recruitment = new RecruitmentModule(http, resolved)
    this.team = new TeamModule(bi, http, resolved)
    this.reports = new ReportsModule(bi, resolved)
    this.contracts = new ContractsModule(bi, resolved)
    this.notifications = new NotificationsModule(http, resolved)
  }

  static fromCredentials(
    credentials: SesameCredentials,
    employeeIndex?: number,
  ): SesameSDK {
    return new SesameSDK(configFromCredentials(credentials, employeeIndex))
  }

  /**
   * Login with email + password directly against Sesame API.
   * No OAuth, no redirects, no client registration needed.
   *
   * @example
   * const sdk = await SesameSDK.login({ email: 'user@company.com', password: '****' })
   * const employees = await sdk.employees.working()
   */
  static async login(params: LoginParams): Promise<SesameSDK> {
    const result = await directLogin(params)
    return new SesameSDK(result.sdkConfig)
  }

  /**
   * Login and return both the SDK instance and the login details.
   */
  static async loginWithDetails(params: LoginParams): Promise<{ sdk: SesameSDK; details: LoginResult }> {
    const details = await directLogin(params)
    const sdk = new SesameSDK(details.sdkConfig)
    return { sdk, details }
  }

  /**
   * Auto-login using a single-use token from a Sesame HR redirect.
   *
   * @example
   * // URL: https://myapp.com/?token=abc123&sesameRegion=back-eu1
   * const sdk = await SesameSDK.autoLogin({ token: 'abc123', region: 'back-eu1' })
   */
  static async autoLogin(params: AutoLoginParams): Promise<SesameSDK> {
    const result = await verifyAutoLoginToken(params)
    return new SesameSDK(result.sdkConfig)
  }

  /**
   * Auto-login and return both the SDK instance and the profile details.
   */
  static async autoLoginWithDetails(params: AutoLoginParams): Promise<{ sdk: SesameSDK; details: AutoLoginResult }> {
    const details = await verifyAutoLoginToken(params)
    const sdk = new SesameSDK(details.sdkConfig)
    return { sdk, details }
  }
}

// Auth
export { directLogin } from './auth.js'
export type { LoginParams, LoginResult, EmployeeEntry } from './auth.js'

// Autologin
export { verifyAutoLoginToken } from './autologin.js'
export type { AutoLoginParams, AutoLoginResult, AutoLoginProfile } from './autologin.js'

// Config
export { resolveConfig, configFromCredentials } from './config.js'
export type { SesameConfig, ResolvedConfig, SesameCredentials } from './config.js'

// Shared types
export type { Paginated, PaginationMeta, PaginationParams, BiPaginationParams, BiFilterParams } from './types.js'
export { employeeFilter } from './types.js'

// Errors
export { SesameError, SesameApiError, SesameConnectionError } from './errors.js'

// Clients
export { HttpClient } from './http.js'
export { BiClient } from './bi.js'
export type { BiQuery, BiSelectField, BiWhereCondition, BiOrderBy } from './bi.js'

// Retry
export { withRetry } from './retry.js'
export type { RetryOptions } from './retry.js'

// Modules
export { EmployeesModule } from './modules/employees.js'
export { ChecksModule } from './modules/checks.js'
export { VacationsModule } from './modules/vacations.js'
export { WorkStatsModule } from './modules/work-stats.js'
export { EvaluationsModule } from './modules/evaluations.js'
export { DocumentsModule } from './modules/documents.js'
export { ExpensesModule } from './modules/expenses.js'
export { AnnouncementsModule } from './modules/announcements.js'
export { JobChargesModule } from './modules/job-charges.js'
export { RecruitmentModule } from './modules/recruitment.js'
export { TeamModule } from './modules/team.js'
export { ReportsModule, BI_TABLES, BI_TEMPORAL } from './modules/reports.js'
export { ContractsModule } from './modules/contracts.js'
export { NotificationsModule } from './modules/notifications.js'

// Module types
export type { Employee, EmployeeGroupCount, MeProfile, ListEmployeesParams } from './modules/employees.js'
export type { CheckEntry, CheckAggregation, CheckResult, CheckHistoryParams, Coordinates, WorkBreak, CheckRequestParams, CheckRequestEntry } from './modules/checks.js'
export type { VacationCalendar, DayOff, DayOffRequest, DayOffGroupCount, RequestVacationParams } from './modules/vacations.js'
export type { WorkStatsResult, WorkStatsParams } from './modules/work-stats.js'
export type { Evaluation, EvaluationResults, ListEvaluationsParams } from './modules/evaluations.js'
export type { Directory, SesameDocument, ListDocumentsParams, UploadDocumentParams } from './modules/documents.js'
export type { Expense, ExpenseCategory, ListExpensesParams } from './modules/expenses.js'
export type { Announcement, ListAnnouncementsParams } from './modules/announcements.js'
export type { JobCharge, JobChargeEmployee, ListJobChargesParams } from './modules/job-charges.js'
export type { Vacancy, VacancyTotals, Candidate, ListVacanciesParams } from './modules/recruitment.js'
export type { TeamMember, TeamCheck, TeamRequestEntry, TeamGroupCount } from './modules/team.js'
export type { Contract, ContractGroupCount, ListContractsParams } from './modules/contracts.js'
export type { SendPushParams } from './modules/notifications.js'
