#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio'

import { loadMcpConfig } from './config.js'
import { createLogger } from './logger.js'
import { createHttpMutationApprovalStore } from './mutation-approval-http.js'
import { createAuthenChainMcpServer } from './server.js'
import { loginWithOAuth, oauthLogout, oauthStatus, resolveOAuthAccessToken, resolveOAuthEnvironment } from './oauth-cli.js'

async function main() {
  const command = process.argv[2]
  if (command === 'login') {
    if (process.env.AUTHENCHAIN_MCP_REMOTE_ENABLED !== 'true') throw new Error('remote_gateway_unavailable: use a read-only API key for stdio; OAuth requires a validated remote gateway and AUTHENCHAIN_MCP_REMOTE_ENABLED=true')
    const environmentArg = process.argv.find((value) => value.startsWith('--environment='))?.split('=')[1]
    const environment = environmentArg === 'production' ? 'production' : 'sandbox'
    const result = await loginWithOAuth({ write: process.argv.includes('--write'), environment })
    process.stdout.write(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`)
    return
  }
  if (command === 'status') {
    process.stdout.write(`${JSON.stringify(await oauthStatus(), null, 2)}\n`)
    return
  }
  if (command === 'logout') {
    const result = await oauthLogout()
    process.stdout.write(`${JSON.stringify({ ok: result.revocation !== 'failed', ...result })}\n`)
    if (result.revocation === 'failed') process.exitCode = 1
    return
  }
  const source = { ...process.env }
  let credentialKind: 'api-key' | 'oauth' = 'api-key'
  if (!source.AUTHENCHAIN_API_KEY) {
    source.AUTHENCHAIN_API_KEY = await resolveOAuthAccessToken()
    source.AUTHENCHAIN_MCP_ENVIRONMENT = await resolveOAuthEnvironment()
    credentialKind = 'oauth'
  }
  const config = loadMcpConfig(source, { credentialKind })
  if (credentialKind === 'oauth' && config.expectedEnvironment === 'production') {
    config.mutationApprovalStore = createHttpMutationApprovalStore({
      baseUrl: config.baseUrl,
      accessToken: config.apiKey,
      timeoutMs: config.timeoutMs,
    })
  }
  const logger = createLogger(config)
  const handle = serveStdio(() => createAuthenChainMcpServer(config), {
    onerror: (error) => logger.error('transport.error', { name: error.name, message: error.message }),
    maxSubscriptions: 128,
  })
  const shutdown = async (signal: string) => {
    logger.info('server.shutdown', { signal })
    await handle.close()
    process.exit(0)
  }
  process.once('SIGINT', () => { void shutdown('SIGINT') })
  process.once('SIGTERM', () => { void shutdown('SIGTERM') })
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    service: 'authenchain-mcp',
    event: 'startup.failed',
    message: error instanceof Error ? error.message : 'Unknown startup error',
  })}\n`)
  process.exitCode = 1
})
