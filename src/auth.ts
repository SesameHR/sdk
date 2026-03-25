import type { SesameConfig } from './config.js'
import { SesameApiError } from './errors.js'
import { doFetch, validateSubdomain } from './internal-fetch.js'

const LOGIN_FINDER_URL = 'https://login.sesametime.com'
const PRE_LOGIN_ENDPOINT = '/private/login-finder/v1/pre-login'
const LOGIN_ENDPOINT = '/api/v3/security/login'
const ME_ENDPOINT = '/api/v3/security/me-oauth'

export interface LoginParams {
  email: string
  password: string
}

export interface EmployeeEntry {
  id: string
  firstName: string
  lastName: string
  email: string
  companyId: string
  companyName: string
}

export interface LoginResult {
  token: string
  region: string
  /** Default (first) employee ID */
  employeeId: string
  /** Default (first) company ID */
  companyId: string
  /** SDK config for the default employee — pass to new SesameSDK() */
  sdkConfig: SesameConfig
  /** Default (first) employee details */
  employee: EmployeeEntry
  /** All employees/companies the user belongs to. Length > 1 means multi-company. */
  employees: EmployeeEntry[]
}

/**
 * Direct login against Sesame API.
 * Same flow the SSO uses internally - no OAuth, no redirects.
 *
 * 1. POST login-finder → get region
 * 2. POST /api/v3/security/login → get token
 * 3. GET /api/v3/security/me-oauth → get employee details
 */
export async function directLogin(params: LoginParams): Promise<LoginResult> {
  // Step 1: Find region
  const region = await findRegion(params.email)

  // Step 2: Login → get token
  const subdomain = `back-${region.toLowerCase()}`
  validateSubdomain(subdomain)
  const baseUrl = `https://${subdomain}.sesametime.com`
  const token = await performLogin(baseUrl, params.email, params.password)

  // Step 3: Get all employee entries
  const employees = await getEmployees(baseUrl, token)
  const employee = employees[0]

  const sdkConfig: SesameConfig = {
    token,
    region,
    companyId: employee.companyId,
    employeeId: employee.id,
  }

  return { token, region, employeeId: employee.id, companyId: employee.companyId, sdkConfig, employee, employees }
}

async function findRegion(email: string): Promise<string> {
  const json = await doFetch(`${LOGIN_FINDER_URL}${PRE_LOGIN_ENDPOINT}`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

  const region = json.data?.region as string | undefined
  if (!region) throw new SesameApiError(400, { message: 'Could not determine region for this email' })
  return region
}

async function performLogin(baseUrl: string, email: string, password: string): Promise<string> {
  const json = await doFetch(`${baseUrl}${LOGIN_ENDPOINT}`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  const token = json.data as string | undefined
  if (!token) throw new SesameApiError(401, { message: 'Invalid credentials' })
  return token
}

async function getEmployees(baseUrl: string, token: string): Promise<EmployeeEntry[]> {
  const json = await doFetch(`${baseUrl}${ME_ENDPOINT}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

  // me-oauth returns { data: [{ employee: { id, ... }, accumulatedSeconds, ... }] }
  const entries = Array.isArray(json.data) ? json.data : [json.data]

  const employees: EmployeeEntry[] = entries
    .map((entry: Record<string, unknown>) => {
      const emp = (entry?.employee ?? entry) as Record<string, unknown>
      if (!emp?.id) return null
      const fullName = emp.fullName as Record<string, string> | undefined
      const email = emp.email as Record<string, string> | undefined
      const company = emp.companyView as Record<string, string> | undefined
      return {
        id: emp.id as string,
        firstName: fullName?.firstName ?? '',
        lastName: fullName?.lastName ?? '',
        email: email?.value ?? '',
        companyId: company?.id ?? '',
        companyName: company?.name ?? '',
      }
    })
    .filter((e: EmployeeEntry | null): e is EmployeeEntry => e !== null)

  if (employees.length === 0) {
    throw new SesameApiError(500, { message: 'Could not retrieve employee details' })
  }

  return employees
}

