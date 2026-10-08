import { AuthenChainValidationError } from './errors.js'
import { assertNoUnknownKeys } from './internal.js'
import { signProvenance } from './sign.js'
import { validateRegulatoryMetadata } from './regulatory-metadata.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  CaptureRegulatedOutputInput,
  CaptureRegulatedOutputResponse,
} from './types.js'

export async function captureRegulatedOutput<TOutput>(
  client: AuthenChainHttpClient,
  input: CaptureRegulatedOutputInput<TOutput>
): Promise<CaptureRegulatedOutputResponse<TOutput>> {
  assertNoUnknownKeys(
    input,
    [
      'output',
      'serializeOutput',
      'contentEncoding',
      'schema_version',
      'issuer',
      'content_type',
      'created_at',
      'nonce',
      'trace_id',
      'model',
      'user_ref',
      'extra',
      'regulatory',
      'generateMetadataDefaults',
      'idempotencyKey',
      'requestId',
      'correlationId',
    ],
    'AuthenChain.captureRegulatedOutput input',
    client.strictInputValidation
  )

  const validation = validateRegulatoryMetadata(input.regulatory)
  if (!validation.valid || !validation.regulatory) {
    throw new AuthenChainValidationError({
      message: 'AuthenChain.captureRegulatedOutput requires valid regulatory metadata',
      code: 'INVALID_REGULATORY_METADATA',
      details: {
        errors: validation.errors,
        warnings: validation.warnings,
      },
    })
  }

  const content = serializeRegulatedOutput(input.output, input.serializeOutput)
  const provenance = await signProvenance(client, {
    content,
    contentEncoding: input.contentEncoding,
    metadata: {
      ...(input.schema_version == null ? {} : { schema_version: input.schema_version }),
      issuer: input.issuer,
      ...(input.content_type == null ? {} : { content_type: input.content_type }),
      ...(input.created_at == null ? {} : { created_at: input.created_at }),
      ...(input.nonce == null ? {} : { nonce: input.nonce }),
      ...(input.trace_id == null ? {} : { trace_id: input.trace_id }),
      ...(input.model == null ? {} : { model: input.model }),
      ...(input.user_ref == null ? {} : { user_ref: input.user_ref }),
      ...(input.extra == null ? {} : { extra: input.extra }),
      regulatory: validation.regulatory,
    },
    generateMetadataDefaults: input.generateMetadataDefaults,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    correlationId: input.correlationId,
  })

  return {
    output: input.output,
    provenance,
    regulatory: {
      metadataValid: true,
      regulatoryEvidenceStatus: validation.warnings.length > 0 ? 'incomplete' : 'complete',
      legalCompliance: 'not_determined',
      warnings: validation.warnings,
    },
  }
}

function serializeRegulatedOutput<TOutput>(output: TOutput, serializeOutput?: (output: TOutput) => string) {
  if (serializeOutput) {
    const serialized = serializeOutput(output)
    if (typeof serialized !== 'string') {
      throw new AuthenChainValidationError({
        message: 'captureRegulatedOutput serializeOutput must return a string',
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
      message: 'captureRegulatedOutput could not serialize the regulated output',
      code: 'INVALID_REGULATED_OUTPUT',
      details: { outputType: typeof output },
    })
  }
  return serialized
}
