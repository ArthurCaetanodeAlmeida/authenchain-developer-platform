export async function checkCanonicalHealth(expectedRevision) {
  const url = 'https://api.authenchain.com/api/health'
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('Canonical HTTPS health failed')
  const body = await response.json()
  if (body.ok !== true || body.db !== 'ok' || body.redis !== 'ok') throw new Error('Canonical dependencies failed')
  if (expectedRevision && (body.build?.revision !== expectedRevision || body.build?.dirty !== false)) throw new Error('Canonical production revision differs from the release source')
  console.log(JSON.stringify({ canonicalHttps: true, db: 'ok', redis: 'ok' }))
}
