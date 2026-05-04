import { appConfig } from '../config/env'

type ApiRequestOptions<TMock> = RequestInit & {
  mockData: TMock
}

export async function apiRequest<TResponse>(path: string, options: ApiRequestOptions<TResponse>): Promise<TResponse> {
  const { mockData, headers, ...requestInit } = options
  const endpoint = `${appConfig.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`

  try {
    const response = await fetch(endpoint, {
      ...requestInit,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })

    if (!response.ok) {
      return mockData
    }

    return (await response.json()) as TResponse
  } catch {
    return mockData
  }
}
