import { AuthenChainValidationError } from './errors.js'
import { ensureJsonSerializable } from './internal.js'
import type { ContentEvidenceInput, ContentEvidenceSideInput } from './types.js'

// PHASE3-SDK-003: contentEvidence used to ship plaintext over TLS to the
// AuthenChain server when callers populated `input.content` /
// `output.content` on a ContentEvidenceInput - no explicit opt-in, no
// warning, no encrypted alternative. Hook handlers, corporate proxies,
// APM tools, and crash dumps can retain that plaintext for hours.
//
// The fix forces every caller to pick a mode:
//
//   - 'hash_only'             : strip every `.content` field; only
//                               hashes/metadata travel.
//   - 'encrypted'             : caller asserts each side's `.content`
//                               value is already ciphertext (e.g. a
//                               base64 blob); SDK passes it through.
//   - 'plaintext_acknowledged': caller has explicitly chosen to send
//                               plaintext to the server. Reserved for
//                               integration tests / debug; emits no
//                               warning here (the type-level
//                               acknowledgment is the warning).
//
// When `contentEvidence` is provided but `captureMode` is undefined AND
// any side carries `.content`, the SDK fails closed with
// `CONTENT_EVIDENCE_MODE_REQUIRED` so a caller cannot accidentally leak
// plaintext through an old-shape contentEvidence object.

export type SafeContentEvidenceMode =
  | 'hash_only'
  | 'encrypted'
  | 'plaintext_acknowledged'

function sideHasPlaintextContent(side: ContentEvidenceSideInput | undefined): boolean {
  if (!side) return false
  return typeof side.content === 'string' && side.content.length > 0
}

function stripPlaintextFromSide(
  side: ContentEvidenceSideInput | undefined
): ContentEvidenceSideInput | undefined {
  if (!side) return side
  if (!('content' in side)) return side
  const { content: _content, ...rest } = side
  return rest
}

export function prepareContentEvidenceForWire(
  input: ContentEvidenceInput | undefined | null,
  label: 'contentEvidence'
): unknown {
  if (input == null) return undefined

  const carriesPlaintext =
    sideHasPlaintextContent(input.input) || sideHasPlaintextContent(input.output)
  const captureMode = (input as { captureMode?: SafeContentEvidenceMode }).captureMode

  if (carriesPlaintext && captureMode == null) {
    throw new AuthenChainValidationError({
      message:
        `${label} carries plaintext .content but no captureMode was specified. ` +
        `Set contentEvidence.captureMode to one of: ` +
        `'hash_only' (strip plaintext, ship only hashes), ` +
        `'encrypted' (caller asserts .content is already ciphertext), ` +
        `'plaintext_acknowledged' (caller has explicitly opted in to ` +
        `sending plaintext evidence to the AuthenChain server).`,
      code: 'CONTENT_EVIDENCE_MODE_REQUIRED',
      details: { context: label },
    })
  }

  if (captureMode === 'hash_only') {
    const stripped: ContentEvidenceInput = {
      ...input,
      captureMode,
      input: stripPlaintextFromSide(input.input),
      output: stripPlaintextFromSide(input.output),
    }
    return ensureJsonSerializable(stripped, label)
  }

  // 'encrypted' / 'plaintext_acknowledged' / no plaintext at all => pass through
  return ensureJsonSerializable(input, label)
}
