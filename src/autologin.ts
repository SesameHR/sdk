import type { SesameConfig } from './config.js'
import { SesameApiError } from './errors.js'
import { doFetch, validateSubdomain } from './internal-fetch.js'

const VERIFY_TOKEN_ENDPOINT = '/private/external-app/v1/verify-token'
const ME_ENDPOINT = '/api/v3/security/me'

export interface AutoLoginParams {
  token: string
  /** Full subdomain, e.g. "back-eu1" */
  region: string
}

export interface AutoLoginProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  companyId: string
  imageProfileURL?: string | null
}

export interface AutoLoginResult {
  token: string
  region: string
  employeeId: string
  companyId: string
  /** SDK config — pass to new SesameSDK() */
  sdkConfig: SesameConfig
  profile: AutoLoginProfile
}

/**
 * Verify an auto-login token from an external Sesame redirect.
 *
 * Flow (mirrors sesame-kitchen SesameAuthController::autoLogin):
 * 1. POST /private/external-app/v1/verify-token → user token
 * 2. GET /api/v3/security/me → employee profile
 *
 * @param params.token  Single-use token from the redirect URL
 * @param params.region Full subdomain (e.g. "back-eu1"), NOT the region code
 */
export async function verifyAutoLoginToken(params: AutoLoginParams): Promise<AutoLoginResult> {
  validateSubdomain(params.region)

  const baseUrl = `https://${params.region}.sesametime.com`

  // Step 1: Exchange token for user token
  const userToken = await exchangeToken(baseUrl, params.token)

  // Step 2: Get employee profile
  const profile = await getProfile(baseUrl, userToken)

  // Extract region code from subdomain (e.g. "back-eu1" → "EU1")
  const regionCode = params.region.replace(/^back-/i, '').toUpperCase()

  const sdkConfig: SesameConfig = {
    token: userToken,
    region: regionCode,
    companyId: profile.companyId,
    employeeId: profile.id,
  }

  return {
    token: userToken,
    region: regionCode,
    employeeId: profile.id,
    companyId: profile.companyId,
    sdkConfig,
    profile,
  }
}

async function exchangeToken(baseUrl: string, token: string): Promise<string> {
  const json = await doFetch(`${baseUrl}${VERIFY_TOKEN_ENDPOINT}`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  })

  const userToken = json.data as string | undefined
  if (!userToken) throw new SesameApiError(401, { message: 'Token verification failed' })
  return userToken
}

async function getProfile(baseUrl: string, userToken: string): Promise<AutoLoginProfile> {
  const json = await doFetch(`${baseUrl}${ME_ENDPOINT}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${userToken}` },
  })

  // /api/v3/security/me returns { data: { id, firstName, lastName, email, groupId, imageProfileURL, ... } }
  const data = json.data as Record<string, unknown> | undefined
  if (!data?.id) {
    throw new SesameApiError(500, { message: 'Could not retrieve employee profile' })
  }

  return {
    id: data.id as string,
    firstName: (data.firstName as string) ?? '',
    lastName: (data.lastName as string) ?? '',
    email: (data.email as string) ?? '',
    companyId: (data.groupId as string) ?? '',
    imageProfileURL: (data.imageProfileURL as string) ?? null,
  }
}
