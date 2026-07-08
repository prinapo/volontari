import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreate = vi.fn()
const mockAxiosPost = vi.fn()
const mockAuthPatch = vi.fn()
const mockErrorLog = vi.fn()

let requestInterceptor
let responseSuccessHandler
let responseErrorHandler
let apiInstance
let assignSpy

function createApiInstance() {
  const instance = vi.fn(config => Promise.resolve({ retried: true, config }))
  instance.get = vi.fn()
  instance.post = vi.fn()
  instance.patch = vi.fn()
  instance.delete = vi.fn()
  instance.defaults = {}
  instance.interceptors = {
    request: {
      use: vi.fn(handler => {
        requestInterceptor = handler
      })
    },
    response: {
      use: vi.fn((success, error) => {
        responseSuccessHandler = success
        responseErrorHandler = error
      })
    }
  }
  return instance
}

async function loadApiModule() {
  vi.resetModules()
  requestInterceptor = undefined
  responseSuccessHandler = undefined
  responseErrorHandler = undefined
  apiInstance = createApiInstance()
  mockCreate.mockReturnValue(apiInstance)

  vi.doMock('axios', () => ({
    default: {
      create: (...args) => mockCreate(...args),
      post: (...args) => mockAxiosPost(...args)
    }
  }))

  vi.doMock('src/stores/auth.store', () => ({
    useAuthStore: () => ({
      $patch: (...args) => mockAuthPatch(...args)
    })
  }))

  vi.doMock('src/services/error-log.service', () => ({
    errorLogService: {
      log: (...args) => mockErrorLog(...args)
    }
  }))

  return (await import('src/services/api')).default
}

function makeInvalidTokenError(overrides = {}) {
  return {
    config: {
      url: '/items/Famiglie',
      baseURL: 'https://api.example.test',
      method: 'get',
      headers: {},
      ...overrides.config
    },
    response: {
      status: 401,
      data: {
        errors: [
          {
            message: 'token invalid',
            extensions: { code: 'INVALID_PAYLOAD' }
          }
        ]
      },
      ...overrides.response
    },
    ...overrides
  }
}

describe('api.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/area-riservata',
        assign: assignSpy
      }
    })
  })

  it('creates the axios instance and registers interceptors', async () => {
    const api = await loadApiModule()

    expect(api).toBe(apiInstance)
    expect(mockCreate).toHaveBeenCalledWith({
      baseURL: expect.any(String),
      timeout: 30000
    })
    expect(typeof requestInterceptor).toBe('function')
    expect(typeof responseSuccessHandler).toBe('function')
    expect(typeof responseErrorHandler).toBe('function')
  })

  it('request interceptor adds bearer token and cache-busting timestamp to GET requests', async () => {
    await loadApiModule()
    localStorage.setItem('access_token', 'access-123')

    const config = requestInterceptor({
      headers: {},
      method: 'get',
      url: '/items/Famiglie?limit=10'
    })

    expect(config.headers.Authorization).toBe('Bearer access-123')
    expect(config.url).toMatch(/^\/items\/Famiglie\?limit=10&_t=\d+$/)
  })

  it('response success interceptor returns the response untouched', async () => {
    await loadApiModule()
    const response = { data: { ok: true } }

    expect(responseSuccessHandler(response)).toBe(response)
  })

  it('clears session and redirects to login when token is invalid and refresh token is missing', async () => {
    await loadApiModule()
    localStorage.setItem('access_token', 'old-access')
    const error = makeInvalidTokenError()

    await expect(responseErrorHandler(error)).rejects.toBe(error)

    expect(mockAuthPatch).toHaveBeenCalledWith({
      token: null,
      refreshToken: null,
      user: null,
      contatto: null
    })
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(assignSpy).toHaveBeenCalledWith('/login')
  })

  it('refreshes token and retries the original request when refresh succeeds', async () => {
    await loadApiModule()
    localStorage.setItem('refresh_token', 'refresh-123')
    mockAxiosPost.mockResolvedValueOnce({
      data: {
        data: {
          access_token: 'new-access',
          refresh_token: 'new-refresh'
        }
      }
    })

    const error = makeInvalidTokenError()
    const result = await responseErrorHandler(error)

    expect(mockAxiosPost).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/refresh$/), {
      refresh_token: 'refresh-123'
    })
    expect(localStorage.getItem('access_token')).toBe('new-access')
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh')
    expect(error.config._retry).toBe(true)
    expect(error.config.headers.Authorization).toBe('Bearer new-access')
    expect(apiInstance).toHaveBeenCalledWith(error.config)
    expect(result).toEqual({ retried: true, config: error.config })
  })

  it('clears session when refresh fails and rethrows the original error', async () => {
    await loadApiModule()
    localStorage.setItem('refresh_token', 'refresh-123')
    mockAxiosPost.mockRejectedValueOnce(new Error('refresh failed'))
    const error = makeInvalidTokenError()

    await expect(responseErrorHandler(error)).rejects.toBe(error)

    expect(mockAuthPatch).toHaveBeenCalled()
    expect(assignSpy).toHaveBeenCalledWith('/login')
  })

  it('logs non-auth 4xx errors and rethrows them', async () => {
    await loadApiModule()
    const error = {
      config: {
        url: '/items/Famiglie',
        baseURL: 'https://api.example.test',
        method: 'get'
      },
      response: {
        status: 403,
        data: {
          errors: [{ message: 'Permesso negato' }]
        }
      }
    }

    await expect(responseErrorHandler(error)).rejects.toBe(error)

    expect(mockErrorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warning',
        message: 'Permesso negato',
        method: 'GET',
        url: 'https://api.example.test/items/Famiglie',
        status: 403
      })
    )
  })

  it('does not redirect or log for auth endpoint errors', async () => {
    await loadApiModule()
    const error = makeInvalidTokenError({
      config: {
        url: '/auth/login',
        baseURL: 'https://api.example.test',
        method: 'post',
        headers: {}
      }
    })

    await expect(responseErrorHandler(error)).rejects.toBe(error)

    expect(mockAuthPatch).not.toHaveBeenCalled()
    expect(assignSpy).not.toHaveBeenCalled()
    expect(mockErrorLog).not.toHaveBeenCalled()
  })
})
