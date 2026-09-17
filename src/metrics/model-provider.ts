/**
 * Classifies a model ID string into the `AiProvider` it was served by, so
 * `ai.*` gauge metrics can be faceted by provider without a join against the
 * corresponding NR event (see nr-ingest.ts's `emitSessionGauges()`).
 *
 * Two distinct naming shapes exist in this codebase's own pricing table
 * (`src/shared/pricing-data.ts`, vendored — read there, don't edit here):
 *   - Direct-API model IDs, e.g. `claude-sonnet-5`, `gpt-5.4`, `gemini-2.5-pro`.
 *   - AWS Bedrock IDs, always `<vendor>.<model>` or
 *     `<region>.<vendor>.<model>` (e.g. `anthropic.claude-sonnet-5`,
 *     `us.anthropic.claude-opus-5`, `amazon.nova-pro-v1:0`,
 *     `meta.llama3-70b-instruct-v1:0`, `mistral.mistral-large-2402-v1:0`).
 * Bedrock hosts several vendors' models behind one API, so a Bedrock ID
 * classifies as `'bedrock'` regardless of which vendor prefix it carries —
 * `'anthropic'`/`'mistral'` are reserved for that vendor's own direct API.
 */
import type { AiProvider } from '../shared/index.js';

const BEDROCK_REGION_PREFIXES = new Set(['us', 'eu', 'au', 'jp', 'apac', 'global']);
const BEDROCK_VENDOR_PREFIXES = new Set(['anthropic', 'amazon', 'meta', 'mistral']);

export function classifyProvider(model: string): AiProvider | undefined {
  const lower = model.toLowerCase();
  const parts = lower.split('.');
  const vendorIdx = parts.length > 1 && BEDROCK_REGION_PREFIXES.has(parts[0]!) ? 1 : 0;
  if (parts.length > vendorIdx + 1 && BEDROCK_VENDOR_PREFIXES.has(parts[vendorIdx]!)) {
    return 'bedrock';
  }

  if (lower.startsWith('claude')) return 'anthropic';
  if (lower.startsWith('gemini')) return 'google';
  if (lower.startsWith('gpt-') || /^o[134](-|$)/.test(lower)) return 'openai';
  if (
    lower.startsWith('mistral') ||
    lower.startsWith('ministral') ||
    lower.startsWith('codestral')
  ) {
    return 'mistral';
  }
  if (lower.startsWith('command')) return 'cohere';

  return undefined;
}
