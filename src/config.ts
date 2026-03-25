export interface SesameConfig {
  token: string
  region: string
  companyId: string
  employeeId: string
  baseUrl?: string
  biBaseUrl?: string
  timeout?: number
}

export interface ResolvedConfig {
  token: string
  region: string
  companyId: string
  employeeId: string
  baseUrl: string
  biBaseUrl: string
  timeout: number
}

export interface SesameCredentials {
  sesame_private_token: string
  region: string
  sesame_user_id: string
  employees: Array<{
    sesame_employee_id: string
    company_id: string
    company_name: string
    full_name: string
  }>
}

export function resolveConfig(config: SesameConfig): ResolvedConfig {
  return {
    token: config.token,
    region: config.region,
    companyId: config.companyId,
    employeeId: config.employeeId,
    baseUrl: config.baseUrl ?? `https://back-${config.region.toLowerCase()}.sesametime.com`,
    biBaseUrl: config.biBaseUrl ?? 'https://bi-engine.sesametime.com',
    timeout: config.timeout ?? 30_000,
  }
}

/**
 * Build SesameConfig from the credentials returned by
 * @sesamehr/oauth-client's exchangeCodeForToken().sesameCredentials
 */
export function configFromCredentials(
  credentials: SesameCredentials,
  employeeIndex = 0,
): SesameConfig {
  const employee = credentials.employees[employeeIndex]
  if (!employee) {
    throw new Error(
      `No employee at index ${employeeIndex}. Available: ${credentials.employees.length}`,
    )
  }

  return {
    token: credentials.sesame_private_token,
    region: credentials.region,
    companyId: employee.company_id,
    employeeId: employee.sesame_employee_id,
  }
}
