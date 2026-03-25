import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EvaluationsModule } from './evaluations.js'
import { DocumentsModule } from './documents.js'
import { ExpensesModule } from './expenses.js'
import { AnnouncementsModule } from './announcements.js'
import { JobChargesModule } from './job-charges.js'
import { RecruitmentModule } from './recruitment.js'
import { WorkStatsModule } from './work-stats.js'
import type { HttpClient } from '../http.js'
import type { ResolvedConfig } from '../config.js'

function mockHttp() {
  return {
    get: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, lastPage: 1, perPage: 20 } }),
    getData: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({ data: {} }),
    postData: vi.fn().mockResolvedValue({}),
    upload: vi.fn().mockResolvedValue({ id: 'doc-1' }),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as HttpClient
}

const config: ResolvedConfig = {
  token: 'tok',
  region: 'EU1',
  companyId: 'comp-1',
  employeeId: 'emp-1',
  baseUrl: 'https://back-eu1.sesametime.com',
  biBaseUrl: 'https://bi-engine.sesametime.com',
  timeout: 30_000,
}

describe('EvaluationsModule', () => {
  let http: HttpClient
  let mod: EvaluationsModule

  beforeEach(() => {
    http = mockHttp()
    mod = new EvaluationsModule(http, config)
  })

  it('list() calls evaluations endpoint', async () => {
    await mod.list()
    expect(http.getData).toHaveBeenCalledWith(
      '/private/poll/v1/evaluations',
      expect.objectContaining({ limit: 20 }),
    )
  })

  it('list() passes filters', async () => {
    await mod.list({ formType: 'performance', publishType: 'active' })
    expect(http.getData).toHaveBeenCalledWith(
      '/private/poll/v1/evaluations',
      expect.objectContaining({ formType: 'performance', publishType: 'active' }),
    )
  })

  it('detail() fetches by ID', async () => {
    await mod.detail('eval-1')
    expect(http.getData).toHaveBeenCalledWith('/private/poll/v1/evaluations/eval-1')
  })

  it('results() fetches evaluation results', async () => {
    await mod.results('eval-1')
    expect(http.getData).toHaveBeenCalledWith(
      '/private/poll/v1/form-answers/evaluations-results/eval-1',
    )
  })

  it('myEvaluations() fetches employee forms', async () => {
    await mod.myEvaluations()
    expect(http.getData).toHaveBeenCalledWith(
      '/private/poll/v1/evaluations/employees-all-forms',
      expect.objectContaining({ publishType: 'active' }),
    )
  })

  it('pending() fetches pending evaluations', async () => {
    await mod.pending()
    expect(http.getData).toHaveBeenCalledWith(
      '/private/poll/v1/entity-reference-evaluations',
    )
  })
})

describe('DocumentsModule', () => {
  let http: HttpClient
  let mod: DocumentsModule

  beforeEach(() => {
    http = mockHttp()
    mod = new DocumentsModule(http, config)
  })

  it('list() calls documents endpoint with pagination', async () => {
    await mod.list({ limit: 10, page: 2 })
    expect(http.get).toHaveBeenCalledWith(
      '/api/v3/documents',
      expect.objectContaining({
        limit: 10,
        page: 2,
        viewerReferenceType: 'employee',
        viewerReferenceId: config.employeeId,
      }),
    )
  })

  it('directory() fetches by ID', async () => {
    await mod.directory('dir-1')
    expect(http.getData).toHaveBeenCalledWith('/api/v3/directories/dir-1')
  })

  it('downloadUrl() extracts URL from response', async () => {
    ;(http.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { url: 'https://cdn.example.com/file.pdf' },
    })
    const url = await mod.downloadUrl('doc-1')
    expect(url).toBe('https://cdn.example.com/file.pdf')
  })

  it('downloadUrl() throws on missing URL', async () => {
    ;(http.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })
    await expect(mod.downloadUrl('doc-1')).rejects.toThrow('Invalid download URL response')
  })

  it('upload() sends FormData', async () => {
    const file = new Blob(['test'], { type: 'text/plain' })
    await mod.upload({ directoryId: 'dir-1', file, fileName: 'test.txt' })
    expect(http.upload).toHaveBeenCalledWith(
      '/api/v3/directories/dir-1/documents',
      expect.any(FormData),
    )
  })
})

describe('ExpensesModule', () => {
  let http: HttpClient
  let mod: ExpensesModule

  beforeEach(() => {
    http = mockHttp()
    mod = new ExpensesModule(http, config)
  })

  it('list() calls employee-expenses endpoint', async () => {
    await mod.list()
    expect(http.get).toHaveBeenCalledWith(
      '/api/v3/employee-expenses',
      expect.objectContaining({ limit: 20, page: 1 }),
    )
  })

  it('list() passes status filter', async () => {
    await mod.list({ status: 'pending' })
    expect(http.get).toHaveBeenCalledWith(
      '/api/v3/employee-expenses',
      expect.objectContaining({ status: 'pending' }),
    )
  })

  it('detail() fetches by ID', async () => {
    await mod.detail('exp-1')
    expect(http.getData).toHaveBeenCalledWith('/api/v3/expenses/exp-1')
  })

  it('categories() fetches expense categories', async () => {
    await mod.categories()
    expect(http.getData).toHaveBeenCalledWith('/api/v3/expense-categories')
  })

  it('companyExpenses() calls expenses endpoint', async () => {
    await mod.companyExpenses({ employeeId: 'emp-2' })
    expect(http.get).toHaveBeenCalledWith(
      '/api/v3/expenses',
      expect.objectContaining({ employeeId: 'emp-2' }),
    )
  })
})

describe('AnnouncementsModule', () => {
  let http: HttpClient
  let mod: AnnouncementsModule

  beforeEach(() => {
    http = mockHttp()
    mod = new AnnouncementsModule(http, config)
  })

  it('list() calls announcements endpoint', async () => {
    await mod.list()
    expect(http.getData).toHaveBeenCalledWith(
      '/private/notification/v1/employee-announcements',
      expect.objectContaining({ limit: 20 }),
    )
  })

  it('detail() fetches by ID', async () => {
    await mod.detail('ann-1')
    expect(http.getData).toHaveBeenCalledWith(
      '/private/notification/v1/announcements/ann-1',
    )
  })
})

describe('JobChargesModule', () => {
  let http: HttpClient
  let mod: JobChargesModule

  beforeEach(() => {
    http = mockHttp()
    mod = new JobChargesModule(http, config)
  })

  it('list() calls job-charge endpoint', async () => {
    await mod.list()
    expect(http.get).toHaveBeenCalledWith(
      '/private/core/v3/job-charge',
      expect.objectContaining({ limit: 20, page: 1 }),
    )
  })

  it('list() passes name filter', async () => {
    await mod.list({ name: 'engineer' })
    expect(http.get).toHaveBeenCalledWith(
      '/private/core/v3/job-charge',
      expect.objectContaining({ 'name[contains]': 'engineer' }),
    )
  })

  it('detail() fetches by ID', async () => {
    await mod.detail('jc-1')
    expect(http.getData).toHaveBeenCalledWith(
      '/private/core/v3/job-charge/jc-1',
      expect.objectContaining({}),
    )
  })

  it('detail() includes children when requested', async () => {
    await mod.detail('jc-1', true)
    expect(http.getData).toHaveBeenCalledWith(
      '/private/core/v3/job-charge/jc-1',
      expect.objectContaining({ withChildren: true }),
    )
  })

  it('employees() fetches employees for a position', async () => {
    await mod.employees('jc-1')
    expect(http.get).toHaveBeenCalledWith(
      '/private/core/v3/employee-job-charge/jc-1/employees',
      expect.objectContaining({ limit: 20, page: 1 }),
    )
  })
})

describe('RecruitmentModule', () => {
  let http: HttpClient
  let mod: RecruitmentModule

  beforeEach(() => {
    http = mockHttp()
    mod = new RecruitmentModule(http, config)
  })

  it('vacancies() calls vacancies endpoint', async () => {
    await mod.vacancies()
    expect(http.get).toHaveBeenCalledWith(
      `/api/v3/companies/${config.companyId}/vacancies`,
      expect.objectContaining({ limit: 20, page: 1 }),
    )
  })

  it('vacancies() passes status filter', async () => {
    await mod.vacancies({ status: 'open' })
    expect(http.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'open' }),
    )
  })

  it('totals() fetches vacancy totals', async () => {
    await mod.totals()
    expect(http.getData).toHaveBeenCalledWith('/api/v3/vacancies-totals')
  })

  it('vacancy() fetches by ID', async () => {
    await mod.vacancy('vac-1')
    expect(http.getData).toHaveBeenCalledWith('/api/v3/vacancies/vac-1')
  })

  it('candidates() fetches for a vacancy', async () => {
    await mod.candidates('vac-1')
    expect(http.get).toHaveBeenCalledWith(
      `/api/v3/companies/${config.companyId}/candidates`,
      expect.objectContaining({ vacancyId: 'vac-1' }),
    )
  })
})

describe('WorkStatsModule', () => {
  let http: HttpClient
  let mod: WorkStatsModule

  beforeEach(() => {
    http = mockHttp()
    mod = new WorkStatsModule(http, config)
  })

  it('summary() posts with employee ID and date range', async () => {
    ;(http.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { secondsWorked: 100, secondsToWork: 200, balance: -100 },
    })
    const result = await mod.summary({ from: '2026-03-01', to: '2026-03-31' })
    expect(result).toEqual(
      expect.objectContaining({ secondsWorked: 100 }),
    )
    expect(http.post).toHaveBeenCalledWith(
      '/api/v3/employees-statistics',
      expect.objectContaining({
        employeeIds: [config.employeeId],
        from: '2026-03-01',
        to: '2026-03-31',
      }),
    )
  })

  it('summary() uses custom employeeId', async () => {
    ;(http.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })
    await mod.summary({ from: '2026-03-01', to: '2026-03-31', employeeId: 'emp-other' })
    expect(http.post).toHaveBeenCalledWith(
      '/api/v3/employees-statistics',
      expect.objectContaining({ employeeIds: ['emp-other'] }),
    )
  })
})
