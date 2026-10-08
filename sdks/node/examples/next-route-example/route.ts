import { NextResponse } from 'next/server'
import { AuthenChain } from '@authenchain/node'

const authenchainApiKey = process.env.AUTHENCHAIN_API_KEY

if (!authenchainApiKey) {
  throw new Error('AUTHENCHAIN_API_KEY is required')
}

const ac = new AuthenChain({
  apiKey: authenchainApiKey,
  baseUrl: process.env.AUTHENCHAIN_BASE_URL,
  timeoutMs: 10_000,
})

async function generateSupportReply(prompt: string): Promise<string> {
  return `Draft reply: ${prompt}\n\nThis placeholder can be replaced with OpenAI, Anthropic, or another server-side model provider.`
}

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string; ticketId?: string }

  if (!body.prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  const requestId = request.headers.get('x-request-id') ?? undefined
  const correlationId = request.headers.get('x-correlation-id') ?? body.ticketId ?? undefined

  const run = await ac.wrapGeneration({
    issuer: 'next-route-example',
    model: 'support-backend-v1',
    requestId,
    correlationId,
    generateMetadataDefaults: true,
    extra: {
      pipeline: 'support_route',
      source: 'next-route-handler',
      notes: `Ticket id: ${body.ticketId ?? 'ticket_demo_123'}`,
    },
    generate: async () => {
      const output = await generateSupportReply(body.prompt!)

      return {
        output,
        model: 'support-backend-v1',
        provider: 'internal-backend',
      }
    },
  })

  const verification = await ac.verify({
    content: run.output,
    provenance: run.provenance,
    requestId,
    correlationId,
  })

  return NextResponse.json({
    output: run.output,
    provenance: run.provenance,
    verification,
  })
}
