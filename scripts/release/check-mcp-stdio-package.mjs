import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'

function transport() {
  return new StdioClientTransport({
    command: process.execPath,
    args: ['packages/mcp/dist/cli.js'],
    env: {
      ...process.env,
      AUTHENCHAIN_API_KEY: 'conformance-placeholder',
      AUTHENCHAIN_MCP_ENVIRONMENT: 'sandbox',
      AUTHENCHAIN_MCP_LOG_LEVEL: 'error',
    },
    stderr: 'pipe',
  })
}

async function verifyModern() {
  const client = new Client(
    { name: 'stdio-modern-check', version: '1.0.0' },
    { versionNegotiation: { mode: { pin: '2026-07-28' }, probe: { timeoutMs: 2_000 } } },
  )
  try {
    await client.connect(transport())
    if (client.getNegotiatedProtocolVersion() !== '2026-07-28' || client.getProtocolEra() !== 'modern') {
      throw new Error('stdio server did not negotiate MCP 2026-07-28')
    }
    await client.listTools()
  } finally {
    await client.close().catch(() => undefined)
  }
}

async function verifyLegacy() {
  const client = new Client(
    { name: 'stdio-legacy-check', version: '1.0.0' },
    { versionNegotiation: { mode: 'legacy' } },
  )
  try {
    await client.connect(transport())
    if (client.getNegotiatedProtocolVersion() !== '2025-11-25' || client.getProtocolEra() !== 'legacy') {
      throw new Error('stdio server did not negotiate MCP 2025-11-25')
    }
    await client.listTools()
  } finally {
    await client.close().catch(() => undefined)
  }
}

await verifyModern()
await verifyLegacy()
console.log('PASS: stdio negotiates MCP 2026-07-28 and N-1 without corrupting the protocol stream.')
