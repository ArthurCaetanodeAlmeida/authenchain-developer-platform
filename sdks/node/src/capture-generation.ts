import { AuthenChainValidationError } from './errors.js'
import type { AuthenChainHttpClient } from './client.js'
import type { CaptureGenerationInput, CaptureGenerationResponse } from './types.js'
import { signProvenance } from './sign.js'
import { assertNoUnknownKeys } from './internal.js'

export async function captureGeneration<TOutput>(
  client: AuthenChainHttpClient,
  input: CaptureGenerationInput<TOutput>
): Promise<CaptureGenerationResponse<TOutput>> {
  assertNoUnknownKeys(
    input,
    ['output', 'serializeOutput', 'contentEncoding', 'schema_version', 'issuer', 'content_type', 'created_at', 'nonce', 'trace_id', 'model', 'user_ref', 'extra', 'generateMetadataDefaults', 'idempotencyKey', 'requestId', 'correlationId'],
    'AuthenChain.captureGeneration input',
    client.strictInputValidation
  )
  const content = serializeGenerationOutput(input.output, input.serializeOutput)
  const provenance = await signProvenance(client, {
    content,
    contentEncoding: input.contentEncoding,
    metadata: buildCaptureMetadata(input),
    generateMetadataDefaults: input.generateMetadataDefaults,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    correlationId: input.correlationId,
  })

  return {
    output: input.output,
    provenance,
  }
}

function buildCaptureMetadata<TOutput>(input: CaptureGenerationInput<TOutput>) {
  return {
    ...(input.schema_version == null ? {} : { schema_version: input.schema_version }),
    issuer: input.issuer,
    ...(input.content_type == null ? {} : { content_type: input.content_type }),
    ...(input.created_at == null ? {} : { created_at: input.created_at }),
    ...(input.nonce == null ? {} : { nonce: input.nonce }),
    ...(input.trace_id == null ? {} : { trace_id: input.trace_id }),
    ...(input.model == null ? {} : { model: input.model }),
    ...(input.user_ref == null ? {} : { user_ref: input.user_ref }),
    ...(input.extra == null ? {} : { extra: input.extra }),
  }
}

function serializeGenerationOutput<TOutput>(output: TOutput, serializeOutput?: (output: TOutput) => string) {
  if (serializeOutput) {
    const serialized = serializeOutput(output)
    if (typeof serialized !== 'string') {
      throw new AuthenChainValidationError({
        message: 'captureGeneration serializeOutput must return a string',
        code: 'INVALID_SERIALIZER_OUTPUT',
      })
    }
    return serialized
  }

  if (typeof output === 'string') {
    return output
  }

  const serialized = JSON.stringify(output)
  if (typeof serialized !== 'string') {
    throw new AuthenChainValidationError({
      message: 'captureGeneration could not serialize the generation output',
      code: 'INVALID_GENERATION_OUTPUT',
      details: { outputType: typeof output },
    })
  }
  return serialized
}
