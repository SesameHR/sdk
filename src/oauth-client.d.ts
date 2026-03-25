declare module '@sesamehr/oauth-client' {
  export class SesameSSO {
    constructor(
      config: {
        ssoBaseUrl: string
        clientId: string
        clientSecret: string
        redirectUri: string
      },
      options?: {
        defaultScope?: string
        timeout?: number
        stateStore?: unknown
      },
    )

    getLoginUrl(params?: {
      scope?: string
      extraParams?: Record<string, string>
    }): { url: string; state: string }

    exchangeCodeForToken(
      code: string,
      state: string,
      options?: {
        includeUserInfo?: boolean
        includeSesameCredentials?: boolean
      },
    ): Promise<{
      accessToken: string
      refreshToken: string
      expiresIn: number
      tokenType: string
      userData?: Record<string, unknown>
      sesameCredentials: {
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
    }>

    refreshToken(refreshToken: string): Promise<{
      accessToken: string
      refreshToken: string
      expiresIn: number
    }>

    revokeToken(token: string, tokenTypeHint?: string): Promise<void>
  }

  export class SesameHelpers {
    static getApiUrl(region: string): string
  }
}
