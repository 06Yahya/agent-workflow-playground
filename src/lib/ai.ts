/**
 * Workers AI adapter with model fallback and structured JSON extraction.
 * The workflows depend on this interface, not on a specific model provider.
 */

export interface AiOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiTextResult {
  text: string;
  model: string;
}

const DEFAULT_OPTIONS: Required<AiOptions> = {
  model: '@cf/meta/llama-3.2-3b-instruct',
  maxTokens: 1600,
  temperature: 0.2,
};

const FALLBACK_MODELS = [
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/mistral/mistral-7b-instruct-v0.1',
];

export async function runInference(
  ai: Ai,
  systemPrompt: string,
  userMessage: string,
  options: AiOptions = {},
): Promise<AiTextResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const modelsToTry = [opts.model, ...FALLBACK_MODELS.filter((model) => model !== opts.model)];
  let lastError = 'unknown error';

  for (const model of modelsToTry) {
    try {
      const response = await ai.run(model, {
        messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        stream: false,
      });

      const text = extractText(response);
      if (text) return { text, model };
      lastError = 'empty model response';
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error('All Workers AI models failed. Last error: ' + lastError);
}

export async function runInferenceStructured<T>(
  ai: Ai,
  systemPrompt: string,
  userMessage: string,
  options: AiOptions = {},
): Promise<{ data: T | null; raw: string; model: string }> {
  const result = await runInference(ai, systemPrompt, userMessage, {
    ...options,
    temperature: options.temperature ?? 0.1,
  });

  return { data: parseJsonFromText<T>(result.text), raw: result.text, model: result.model };
}

export function parseJsonFromText<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();

  try {
    return JSON.parse(candidate) as T;
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractText(response: unknown): string {
  if (!response || typeof response !== 'object') return '';
  const record = response as Record<string, unknown>;
  if (typeof record.response === 'string') return record.response.trim();
  if (typeof record.result === 'string') return record.result.trim();
  if (typeof record.text === 'string') return record.text.trim();
  return '';
}
