/**
 * Workers AI abstraction layer.
 * Wraps Cloudflare Workers AI so model provider can be swapped later.
 * Uses free-tier Llama 3.2 3B (widely available, low latency).
 */

export type AiOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

const DEFAULT_OPTIONS: AiOptions = {
  model: '@cf/meta/llama-3.2-3b-instruct',
  maxTokens: 2048,
  temperature: 0.3,
};

// Fallback models if primary is unavailable
const FALLBACK_MODELS = [
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/mistral/mistral-7b-instruct-v0.1',
  '@cf/meta/llama-3.1-8b-instruct-fast',
];

export async function runInference(
  ai: Ai,
  systemPrompt: string,
  userMessage: string,
  options: AiOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  // Build model list: user override first, then primary, then fallbacks
  const modelsToTry = [
    opts.model!,
    ...FALLBACK_MODELS.filter((m) => m !== opts.model),
  ];

  let lastError: string | null = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.run(model, {
        messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        stream: false,
      });

      const result = response as { response: string };
      const text = result.response?.trim();
      if (text) return text;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // Try next model
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`);
}

export async function runInferenceStructured<T>(
  ai: Ai,
  systemPrompt: string,
  userMessage: string,
  options: AiOptions = {}
): Promise<T | null> {
  const raw = await runInference(ai, systemPrompt, userMessage, {
    ...options,
    temperature: 0.1, // lower temp for structured output
  });

  // Try to extract JSON from the response
  try {
    // Find JSON block in markdown fences
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim();
    return JSON.parse(jsonStr) as T;
  } catch {
    // If parsing fails, return null so caller can fall back
    return null;
  }
}
