import { AuthenChainError, AuthenChainValidationError } from './errors.js'
import { assertNoUnknownKeys } from './internal.js'
import type { AuthenChainHttpClient } from './client.js'
import type {
  JsonObject,
  WrapGenerationCallbackResult,
  WrapGenerationInput,
  WrapGenerationOutputFromResult,
  WrapGenerationResponse,
  WrapGenerationResultObject,
} from './types.js'
import { captureGeneration } from './capture-generation.js'

export async function wrapGeneration<
  TResult = WrapGenerationCallbackResult,
  TOutput = WrapGenerationOutputFromResult<TResult>,
>(
  client: AuthenChainHttpClient,
  input: WrapGenerationInput<TResult, TOutput>
): Promise<WrapGenerationResponse<TResult, TOutput>> {
  assertNoUnknownKeys(
    input,
    ['run', 'generate', 'mapOutput', 'serializeOutput', 'contentEncoding', 'schema_version', 'issuer', 'content_type', 'created_at', 'nonce', 'trace_id', 'model', 'user_ref', 'extra', 'generateMetadataDefaults', 'idempotencyKey', 'requestId', 'correlationId'],
    'AuthenChain.wrapGeneration input',
    client.strictInputValidation
  )
  const generator = input.generate ?? input.run

  if (!generator) {
    throw new AuthenChainValidationError({
      message: 'wrapGeneration requires either generate or run',
      code: 'MISSING_GENERATE_CALLBACK',
    })
  }

  let result: TResult
  try {
    result = await generator()
  } catch (error) {
    throw new AuthenChainError({
      message: 'AuthenChain.wrapGeneration generate callback failed',
      code: 'WRAP_GENERATION_FAILED',
      details: {
        issuer: input.issuer,
        model: input.model,
      },
      cause: error,
    })
  }

  const normalized = await normalizeWrapResult(result, input)
  const extra = mergeExtra(input.extra, normalized.provider)
  const model = input.model ?? normalized.model

  const captured = await captureGeneration(client, {
    output: normalized.output,
    serializeOutput: input.serializeOutput,
    contentEncoding: input.contentEncoding,
    schema_version: input.schema_version,
    issuer: input.issuer,
    content_type: input.content_type,
    created_at: input.created_at,
    nonce: input.nonce,
    trace_id: input.trace_id,
    model,
    user_ref: input.user_ref,
    extra,
    generateMetadataDefaults: input.generateMetadataDefaults,
    idempotencyKey: input.idempotencyKey,
    requestId: input.requestId,
    correlationId: input.correlationId,
  })

  return {
    result,
    output: normalized.output,
    provenance: captured.provenance,
  }
}

async function normalizeWrapResult<TResult, TOutput>(
  result: TResult,
  input: WrapGenerationInput<TResult, TOutput>
): Promise<{ output: TOutput; model?: string; provider?: string }> {
  if (input.mapOutput) {
    return {
      output: await input.mapOutput(result),
      model: isWrapGenerationObject(result) ? result.model : undefined,
      provider: isWrapGenerationObject(result) ? result.provider : undefined,
    }
  }

  if (typeof result === 'string') {
    return { output: result as TOutput }
  }

  if (isWrapGenerationObject(result)) {
    return {
      output: result.output as TOutput,
      model: result.model,
      provider: result.provider,
    }
  }

  throw new AuthenChainValidationError({
    message:
      'wrapGeneration requires mapOutput when generate/run does not return a string or { output: string }',
    code: 'INVALID_WRAP_RESULT',
    details: {
      resultType: typeof result,
    },
  })
}

function mergeExtra(extra: JsonObject | undefined, provider: string | undefined) {
  if (!provider) return extra
  if (!extra) {
    return {
      source: provider,
    }
  }
  if (typeof extra.source === 'string' && extra.source.trim()) {
    return extra
  }
  return {
    ...extra,
    source: provider,
  }
}

function isWrapGenerationObject(value: unknown): value is WrapGenerationResultObject {
  return Boolean(value) && typeof value === 'object' && typeof (value as { output?: unknown }).output === 'string'
}
