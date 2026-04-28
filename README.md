# @sesamehr/sdk

SDK for the Sesame HR private API. Uses the **BI Engine** for reads and the **REST API** for writes.

## Install

```bash
npm install @sesamehr/sdk

# Or from local folder:
npm install /path/to/sesame-sdk
```

## Quick start

```typescript
import { SesameSDK } from '@sesamehr/sdk'

// Direct login (no OAuth needed)
const sdk = await SesameSDK.login({ email: 'user@company.com', password: '****' })

// Or with existing credentials
const sdk = new SesameSDK({ token, region, companyId, employeeId })
```

## Response types

Every method returns typed data. Here are the shapes you'll receive:

### Employee
```typescript
// Returned by: employees.list(), employees.working(), employees.onBreak(),
//              employees.remote(), employees.offline(), employees.search(),
//              team.status(), team.working()
{
  name: string           // "JANE DOE SMITH"
  firstName: string      // "JANE"
  lastName: string       // "DOE SMITH"
  email: string          // "jane.doe@company.com"
  phone?: string
  status: string         // "active" | "inactive"
  workStatus: string     // "online" | "offline" | "paused" | "remote"
  department?: string    // "Engineering"
  office?: string        // "Madrid"
  jobCharge?: string     // "Software Engineer"
  code?: number
  imageProfileURL?: string
}
```

### GroupCount
```typescript
// Returned by: employees.byDepartment(), employees.byOffice(),
//              employees.byJobCharge(), employees.count(),
//              team.statusSummary(), vacations.byType(),
//              vacations.requestsByEmployee(), contracts.byType(),
//              contracts.statusSummary()
{
  group: string          // "Sales" | "active" | "online"
  count: number          // 42
}
```

### CheckEntry
```typescript
// Returned by: checks.history(), checks.today(), checks.thisWeek(),
//              checks.thisMonth(), checks.remoteOnly(), checks.openChecks(),
//              checks.byEmployee(), team.employeeChecks()
{
  date: string           // "2026-03-25"
  checkIn?: string       // "2026-03-25T07:53:10+01:00"
  checkOut?: string      // "2026-03-25T15:45:39+01:00" (null if still open)
  secondsWorked: number  // 28302
  isRemote: string       // "1" or "0" (BI boolean)
  type: string           // "work"
  employeeName?: string  // "JANE DOE SMITH"
  department?: string    // "Engineering"
}
```

### CheckAggregation
```typescript
// Returned by: checks.hoursByEmployee(), checks.hoursByDepartment(),
//              checks.totalHours(), checks.count()
{
  group: string          // employee name or department name
  totalSeconds: number   // 354670
  count: number          // 45
}
```

### VacationCalendar
```typescript
// Returned by: vacations.calendars(), vacations.balanceByEmployee()
{
  year: number           // 2026
  maxDaysOff: number     // 22
  remainingDaysOff: number // 17
  calendarType: string   // "vacation"
  employeeName?: string  // "JANE DOE SMITH"
}
```

### DayOff
```typescript
// Returned by: vacations.history()
{
  date: string           // "2026-03-25"
  name: string           // absence type name
  seconds?: number       // 28800
  startTime?: string
  endTime?: string
  employeeName?: string
  absenceType?: string   // "Baja Maternidad / Paternidad"
}
```

### DayOffRequest / TeamRequestEntry
```typescript
// Returned by: vacations.pendingRequests(), team.checkRequests(),
//              team.vacationRequests()
{
  status: string         // "pending"
  type: string           // "create" | "work"
  comment?: string       // "Vacaciones de verano"
  createdAt?: string     // "2026-03-25T08:31:00+01:00"
  employeeName?: string  // "PAULA BAÑULS TORRES"
}
```

### CheckRequestEntry (checks module)
```typescript
// Returned by: checks.myRequests()
{
  status: string         // "pending"
  type: string           // "work"
  comment?: string
  createdAt?: string
}
```

### Contract
```typescript
// Returned by: contracts.list(), contracts.active(), contracts.expiringSoon()
{
  status: string         // "current" | "terminated" | "previous"
  startDate: string      // "2022-08-01"
  endDate?: string       // "2025-06-30"
  weeklyHours: number    // 40
  fte: number            // 1
  remoteWork?: string
  seniorityDate?: string
  contractType?: string  // "ORDINARIO INDEFINIDO TIEMPO COMPLETO"
  employeeName?: string
}
```

### WorkStatsResult
```typescript
// Returned by: workStats.summary()
{
  secondsWorked: number       // 460721
  secondsToWork: number       // 478800
  balance: number             // -18079
  workedDays: number          // 16
  daysToWork: number          // 17
  avgInSeconds: number        // average clock-in (seconds from midnight)
  avgOutSeconds: number       // average clock-out
  avgWorkBreakSeconds: number
  checksCount: number         // 36
  workBreaksCount: number
  vacationsCount: number
  permissionsCount: number
  avgScheduleSeconds: number
  checksOrigin: { mobile: number; web: number }
  checksOutsideOffice: { inside: number; outside: number }
  checksGeo: { with: number; without: number }
}
```

### MeProfile
```typescript
// Returned by: employees.me()
{
  id: string
  workStatus: string         // "online" | "offline" | "paused" | "remote"
  status: string             // "active" | "inactive"
  email: string
  firstName: string
  lastName: string
  companyId: string
  lastCheckIn?: string       // "2026-03-25T07:53:10+01:00"
  lastCheckOut?: string
  gender?: string
  phone?: string
  imageProfileURL?: string
}
```

### CheckResult
```typescript
// Returned by: checks.clockIn(), checks.clockOut(), checks.pause()
{
  id: string
  employeeId: string
  checkIn: string            // "2026-03-25T07:53:10+01:00"
  checkOut?: string
  origin: string             // "web"
  createdAt: string
}
```

### WorkBreak
```typescript
// Returned by: checks.breaks()
{
  id: string
  name: string           // "Desayuno"
  icon?: string
  breakMinutes: number   // 15
  remunerated: boolean
  active: boolean
}
```

### VacancyTotals
```typescript
// Returned by: recruitment.totals()
{
  total: number          // 87
  open: number           // 48
  closed: number         // 33
  draft: number          // 6
}
```

## Pagination

**BI methods** accept `limit` and `offset`. Default limit is 250 for lists, 50 for aggregations. Always paginate in apps:

```typescript
// Page 1 (first 20)
sdk.employees.list({ limit: 20, offset: 0 })

// Page 2
sdk.employees.list({ limit: 20, offset: 20 })

// Same for all BI methods: checks, vacations, contracts, team
sdk.checks.history({ from, to, limit: 20, offset: 0 })
sdk.vacations.calendars({ year: 2026, limit: 20, offset: 0 })
sdk.contracts.list({ limit: 20, offset: 0 })
```

**REST methods** that return `Paginated<T>` use `limit` and `page` (1-indexed):

```typescript
sdk.documents.list({ limit: 20, page: 1 })   // → Paginated<SesameDocument>
sdk.expenses.list({ limit: 20, page: 2 })     // → Paginated<Expense>
// Paginated response includes: { data: T[], meta: { total, page, lastPage, perPage } }
```

## Employee filter

All BI methods accept an optional `employee` param. Pass a name (LIKE search) or email (exact match):

```typescript
// All employees named matias (partial match)
sdk.vacations.calendars({ year: 2026, employee: 'matias' })

// Exact employee by email
sdk.checks.history({ from, to, employee: 'user@company.com' })
```

## Modules

### employees

```typescript
sdk.employees.list()                          // → Employee[]
sdk.employees.list({ status: 'active' })      // → Employee[] (filtered)
sdk.employees.list({ department: 'Sales' })   // → Employee[] (filtered)
sdk.employees.working()                       // → Employee[] (online/remote)
sdk.employees.onBreak()                       // → Employee[] (paused)
sdk.employees.remote()                        // → Employee[] (remote only)
sdk.employees.offline()                       // → Employee[] (offline)
sdk.employees.search('john')                  // → Employee[] (name LIKE)
sdk.employees.byDepartment()                  // → GroupCount[] (count per dept)
sdk.employees.byOffice()                      // → GroupCount[] (count per office)
sdk.employees.byJobCharge()                   // → GroupCount[] (count per position)
sdk.employees.count()                         // → GroupCount[] (count per status)
sdk.employees.me()                            // → { workStatus, status, lastCheck, ... } (REST)
```

### checks

```typescript
// Reads (BI)
sdk.checks.history({ from, to })              // → CheckEntry[]
sdk.checks.today()                            // → CheckEntry[]
sdk.checks.thisWeek()                         // → CheckEntry[]
sdk.checks.thisMonth()                        // → CheckEntry[]
sdk.checks.byEmployee('name', { from, to })   // → CheckEntry[]
sdk.checks.remoteOnly({ from, to })           // → CheckEntry[]
sdk.checks.openChecks()                       // → CheckEntry[]
sdk.checks.hoursByEmployee({ from, to })      // → CheckAggregation[]
sdk.checks.hoursByDepartment({ from, to })    // → CheckAggregation[]
sdk.checks.totalHours({ from, to })           // → CheckAggregation[]
sdk.checks.myRequests()                       // → CheckRequestEntry[]

// Writes (REST)
sdk.checks.clockIn()
sdk.checks.clockOut()
sdk.checks.pause(breakId)
sdk.checks.breaks()                           // → WorkBreak[]
sdk.checks.requestCreate({ checkIn, checkOut })                             // work (default)
sdk.checks.requestCreate({ checkIn, checkOut, type: 'pause', workBreakId }) // past-day break
sdk.checks.requestEdit(checkId, { checkIn })
sdk.checks.requestDelete(checkId)
```

### vacations

```typescript
// Reads (BI)
sdk.vacations.calendars({ year: 2026 })       // → VacationCalendar[]
sdk.vacations.balanceByEmployee()             // → VacationCalendar[]
sdk.vacations.history({ from, to })           // → DayOff[]
sdk.vacations.byType({ from, to })            // → GroupCount[]
sdk.vacations.pendingRequests()               // → DayOffRequest[]
sdk.vacations.requestsByEmployee()            // → GroupCount[]

// Writes (REST)
sdk.vacations.request({ calendarId, dates: ['2026-04-01'] })
sdk.vacations.cancel(requestId)
```

### workStats

```typescript
sdk.workStats.summary({ from, to })           // → WorkStatsResult (REST)
```

### contracts

```typescript
sdk.contracts.list()                          // → Contract[]
sdk.contracts.active()                        // → Contract[]
sdk.contracts.expiringSoon(90)                // → Contract[]
sdk.contracts.byType()                        // → GroupCount[]
sdk.contracts.statusSummary()                 // → GroupCount[]
```

### team (admin)

```typescript
// Reads (BI)
sdk.team.status()                             // → Employee[] (active employees)
sdk.team.working()                            // → Employee[] (currently working)
sdk.team.statusSummary()                      // → GroupCount[] (count by work status)
sdk.team.employeeChecks('name', { from, to }) // → CheckEntry[]
sdk.team.checkRequests()                      // → TeamRequestEntry[]
sdk.team.vacationRequests()                   // → TeamRequestEntry[]

// Writes (REST)
sdk.team.createCheck(employeeId, { checkIn })
sdk.team.editCheck(checkId, { checkOut })
sdk.team.deleteCheck(checkId)
sdk.team.approveCheckRequest(requestId)
sdk.team.rejectCheckRequest(requestId)
sdk.team.approveVacation(requestId)
sdk.team.rejectVacation(requestId)
```

### reports (raw BI query)

```typescript
import { BI_TABLES, BI_TEMPORAL } from '@sesamehr/sdk'

sdk.reports.query({
  from: BI_TABLES.employees,
  select: [
    { field: 'core_context_employee.name', alias: 'name' },
    { field: 'core_context_employee.email', alias: 'email' },
  ],
  where: [
    { field: 'core_context_employee.work_status', operator: '=', value: 'online' },
  ],
  limit: 10,
})
```

### REST-only modules

```typescript
// Evaluations
sdk.evaluations.list()                        // → Evaluation[]
sdk.evaluations.detail(id)                    // → Evaluation
sdk.evaluations.results(id)                   // → results object
sdk.evaluations.myEvaluations()               // → Evaluation[]
sdk.evaluations.pending()                     // → Evaluation[]

// Documents (paginated)
sdk.documents.list()                          // → Paginated<SesameDocument>
sdk.documents.directory(id)                   // → Directory
sdk.documents.upload({ directoryId, file, fileName })
sdk.documents.downloadUrl(id)                 // → string (URL)

// Expenses (paginated)
sdk.expenses.list()                           // → Paginated<Expense>
sdk.expenses.detail(id)                       // → Expense
sdk.expenses.categories()                     // → ExpenseCategory[]
sdk.expenses.companyExpenses()                // → Paginated<Expense>

// Announcements
sdk.announcements.list()                      // → Announcement[]
sdk.announcements.detail(id)                  // → Announcement

// Job Charges (paginated)
sdk.jobCharges.list()                         // → Paginated<JobCharge>
sdk.jobCharges.detail(id)                     // → JobCharge
sdk.jobCharges.employees(id)                  // → Paginated<employee records>

// Recruitment (paginated)
sdk.recruitment.vacancies()                   // → Paginated<Vacancy>
sdk.recruitment.totals()                      // → VacancyTotals
sdk.recruitment.vacancy(id)                   // → Vacancy
sdk.recruitment.candidates(vacancyId)         // → Paginated<Candidate>
```

## Architecture

- **Reads** use the BI Engine (`bi-engine.sesametime.com`) - a SQL-like query builder with implicit JOINs
- **Writes** use the REST API (`back-{region}.sesametime.com`)
- **Login** authenticates directly against the Sesame API (same flow as SSO internally)
- **Retry**: 2 retries with 500ms delay on connection errors and 5xx (timeouts are not retried)
- **Auth**: Bearer token for all requests. BI also requires `x-company-id` + `X-Region` headers.

## Requirements

- Node.js >= 18.17.0
