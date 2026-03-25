import { describe, it, expect } from 'vitest'
import { SesameApiError, SesameConnectionError } from './errors.js'

describe('SesameApiError', () => {
  it('extracts message from body.error.message', () => {
    const error = new SesameApiError(400, { error: { message: 'Bad request' } })
    expect(error.message).toBe('Bad request')
    expect(error.status).toBe(400)
  })

  it('extracts message from body.message', () => {
    const error = new SesameApiError(401, { message: 'Unauthorized' })
    expect(error.message).toBe('Unauthorized')
  })

  it('extracts message from body.error (string)', () => {
    const error = new SesameApiError(403, { error: 'Forbidden' })
    expect(error.message).toBe('Forbidden')
  })

  it('extracts message from body.error_description', () => {
    const error = new SesameApiError(400, { error_description: 'Invalid grant' })
    expect(error.message).toBe('Invalid grant')
  })

  it('falls back to generic message when body is null', () => {
    const error = new SesameApiError(500, null)
    expect(error.message).toBe('Sesame API error: HTTP 500')
  })

  it('falls back to generic message when body is empty', () => {
    const error = new SesameApiError(404, {})
    expect(error.message).toBe('Sesame API error: HTTP 404')
  })

  it('flattens array messages', () => {
    const error = new SesameApiError(422, { message: ['Field required', 'Invalid email'] })
    expect(error.message).toBe('Field required, Invalid email')
  })

  it('flattens nested array messages', () => {
    const error = new SesameApiError(422, { message: [['Nested'], 'Flat'] })
    expect(error.message).toBe('Nested, Flat')
  })

  it('extracts errors from body.errors', () => {
    const error = new SesameApiError(422, { message: 'Fail', errors: [{ field: 'email' }] })
    expect(error.errors).toEqual([{ field: 'email' }])
  })

  it('extracts errors from body.error.errors', () => {
    const error = new SesameApiError(400, { error: { message: 'Fail', errors: ['a', 'b'] } })
    expect(error.errors).toEqual(['a', 'b'])
  })
})

describe('SesameConnectionError', () => {
  it('formats connection error message', () => {
    const error = new SesameConnectionError('ECONNREFUSED')
    expect(error.message).toBe('Connection failed: ECONNREFUSED')
    expect(error.name).toBe('SesameConnectionError')
  })
})
