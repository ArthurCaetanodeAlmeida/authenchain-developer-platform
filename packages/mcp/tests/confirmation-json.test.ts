import { describe, expect, it } from 'vitest'
import { ConfirmationTokenStore } from '../src/confirmation.js'

describe('confirmation canonical JSON semantics', () => {
  it('omits nested undefined properties and preserves array positions', async () => {
    const store = new ConfirmationTokenStore({ apiKey: 'synthetic-only' })
    const issued = await store.issue({ tool: 'write', environment: 'sandbox', payload: { z: undefined, nested: { id: 'a', absent: undefined }, list: [1, undefined, 2] } })
    await expect(store.claim({ token: issued.token, tool: 'write', environment: 'sandbox', payload: { list: [1, null, 2], nested: { id: 'a' } } })).resolves.toBeUndefined()
    await expect(store.claim({ token: issued.token, tool: 'write', environment: 'sandbox', payload: { list: [1, null, 2], nested: { id: 'a' } } })).rejects.toThrow('replayed')
  })
  it.each([undefined, NaN, Infinity, 1n, new Date()])('rejects non-JSON root values %s', async (payload) => {
    const store = new ConfirmationTokenStore({ apiKey: 'synthetic-only' })
    await expect(store.issue({ tool: 'write', environment: 'sandbox', payload })).rejects.toThrow('confirmation_payload_not_json')
  })
  it('rejects cycles without a stack overflow', async () => {
    const value: any = {}; value.self = value
    await expect(new ConfirmationTokenStore({ apiKey: 'synthetic-only' }).issue({ tool: 'write', environment: 'sandbox', payload: value })).rejects.toThrow('confirmation_payload_not_json')
  })
})
