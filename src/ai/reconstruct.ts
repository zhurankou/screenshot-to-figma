import type { AiProvider } from "../messages";
import { buildReconstructionPrompt } from "../prompt/buildReconstructionPrompt";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODELS_URL = "https://api.openai.com/v1/models";
const ANTHROPIC_MODELS_URL = "https://api.anthropic.com/v1/models";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_TOKENS = 16384;

/** Used when the provider's model list can't be fetched (offline, key scope, etc.). */
const FALLBACK_MODEL: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  gemini: "gemini-2.5-flash"
};

export interface ReconstructParams {
  provider: AiProvider;
  apiKey: string;
  model: string;
  /** "image/png" or "image/jpeg". */
  mediaType: string;
  /** Base64 image data (no `data:` prefix). */
  base64: string;
  width?: number;
  height?: number;
}

/** Pulls a JSON object out of a model response, tolerating code fences and prose. */
export function extractJson(text: string): string {
  let body = text.trim();
  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    body = fenced[1].trim();
  }
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("The model's response did not contain a JSON object.");
  }
  // Strip structural trailing commas (a common LLM mistake): `,]` / `, }` -> `]` / `}`.
  // Only matches a comma followed by whitespace then a closer, so it won't touch
  // commas inside strings.
  return body.slice(start, end + 1).replace(/,(\s*[}\]])/g, "$1");
}

async function errorDetail(response: Response): Promise<string> {
  let detail = `HTTP ${response.status}`;
  try {
    const err = await response.json();
    if (err && err.error && err.error.message) {
      detail = err.error.message;
    }
  } catch {
    // Non-JSON error body; keep the status code.
  }
  if (response.status === 401) {
    detail = "Invalid API key — check the key for this provider.";
  }
  return detail;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, label: string): Promise<Response> {
  try {
    return await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "network error";
    throw new Error(`Could not reach the ${label} API (${detail}). Check your connection.`);
  }
}

/** Anthropic Messages API (browser access via the dangerous-direct header). */
async function callAnthropic(params: ReconstructParams, prompt: string): Promise<string> {
  const response = await postJson(
    ANTHROPIC_URL,
    {
      "content-type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-dangerous-direct-browser-access": "true"
    },
    {
      model: params.model,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: params.mediaType, data: params.base64 } },
            { type: "text", text: prompt }
          ]
        }
      ]
    },
    "Claude"
  );

  if (!response.ok) {
    throw new Error(`Claude API error: ${await errorDetail(response)}`);
  }

  const data = await response.json();
  const blocks: Array<{ type: string; text?: string }> = Array.isArray(data.content) ? data.content : [];
  return blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");
}

interface ChatOptions {
  url: string;
  label: string;
  tokenField: "max_tokens" | "max_completion_tokens";
}

/** OpenAI Chat Completions request (browser calls allowed with a bearer token). */
async function callChatCompletions(opts: ChatOptions, params: ReconstructParams, prompt: string): Promise<string> {
  const dataUrl = `data:${params.mediaType};base64,${params.base64}`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${params.apiKey}`
  };

  const body: Record<string, unknown> = {
    model: params.model,
    // Ask for strict JSON so the model can't wrap it in prose or markdown.
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl } }
        ]
      }
    ]
  };
  body[opts.tokenField] = MAX_TOKENS;

  const response = await postJson(opts.url, headers, body, opts.label);
  if (!response.ok) {
    throw new Error(`${opts.label} API error: ${await errorDetail(response)}`);
  }

  const data = await response.json();
  const choice = Array.isArray(data.choices) ? data.choices[0] : undefined;
  const content = choice && choice.message ? choice.message.content : "";
  return typeof content === "string" ? content : "";
}

/** Gemini generateContent API (free tier; API key passed as a query param). */
async function callGemini(params: ReconstructParams, prompt: string): Promise<string> {
  const url = `${GEMINI_BASE}/${encodeURIComponent(params.model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`;
  const response = await postJson(
    url,
    { "content-type": "application/json" },
    {
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: params.mediaType, data: params.base64 } }
          ]
        }
      ],
      generationConfig: { maxOutputTokens: MAX_TOKENS, responseMimeType: "application/json" }
    },
    "Gemini"
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${await errorDetail(response)}`);
  }

  const data = await response.json();
  const candidate = Array.isArray(data.candidates) ? data.candidates[0] : undefined;
  const parts: Array<{ text?: string }> = candidate && candidate.content ? candidate.content.parts || [] : [];
  return parts
    .filter((p) => typeof p.text === "string")
    .map((p) => p.text as string)
    .join("\n");
}

function pickGemini(models: Array<{ name: string; methods: string[] }>): string | null {
  const exclude = /(lite|preview|exp|thinking|image|audio|tts|embedding|aqa|learnlm|vision-)/i;
  const names = models
    .filter((m) => m.methods.indexOf("generateContent") !== -1)
    .map((m) => m.name.replace(/^models\//, ""));
  const byPref = (re: RegExp) => names.filter((n) => re.test(n) && !exclude.test(n)).sort().reverse();
  const flash = byPref(/^gemini-[\d.]+-flash$/);
  if (flash.length) return flash[0];
  const anyFlash = byPref(/flash/);
  if (anyFlash.length) return anyFlash[0];
  const anyGemini = byPref(/^gemini-/);
  return anyGemini[0] || names[0] || null;
}

function pickOpenAI(ids: string[]): string | null {
  const usable = ids.filter(
    (id) => /^(gpt-4o|gpt-4\.1|gpt-4-turbo|gpt-5|chatgpt-4o|o[134])/.test(id) && !/(audio|realtime|transcribe|tts|search|embedding)/.test(id)
  );
  return (
    usable.find((i) => i === "gpt-4o") ||
    usable.find((i) => /^gpt-4o(-mini)?$/.test(i)) ||
    usable.find((i) => /^gpt-4\.1/.test(i)) ||
    usable[0] ||
    null
  );
}

function pickAnthropic(ids: string[]): string | null {
  return ids.find((i) => /sonnet/.test(i)) || ids.find((i) => /opus/.test(i)) || ids[0] || null;
}

/**
 * Picks a currently-available vision model for the provider using the user's key,
 * so the user never has to choose (or update) a model id. Falls back to a known
 * default if the model list can't be fetched.
 */
export async function resolveModel(provider: AiProvider, apiKey: string): Promise<string> {
  try {
    if (provider === "gemini") {
      const res = await fetch(`${GEMINI_BASE}?key=${encodeURIComponent(apiKey)}`);
      if (res.ok) {
        const data = await res.json();
        const models = Array.isArray(data.models)
          ? data.models.map((m: { name?: string; supportedGenerationMethods?: string[] }) => ({
              name: m.name || "",
              methods: m.supportedGenerationMethods || []
            }))
          : [];
        const picked = pickGemini(models);
        if (picked) return picked;
      }
    } else if (provider === "openai") {
      const res = await fetch(OPENAI_MODELS_URL, { headers: { authorization: `Bearer ${apiKey}` } });
      if (res.ok) {
        const data = await res.json();
        const ids: string[] = Array.isArray(data.data) ? data.data.map((m: { id: string }) => m.id) : [];
        const picked = pickOpenAI(ids);
        if (picked) return picked;
      }
    } else {
      const res = await fetch(ANTHROPIC_MODELS_URL, {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "anthropic-dangerous-direct-browser-access": "true"
        }
      });
      if (res.ok) {
        const data = await res.json();
        const ids: string[] = Array.isArray(data.data) ? data.data.map((m: { id: string }) => m.id) : [];
        const picked = pickAnthropic(ids);
        if (picked) return picked;
      }
    }
  } catch {
    // Network/permission issue — fall through to the default.
  }
  return FALLBACK_MODEL[provider];
}

/**
 * Sends the screenshot and reconstruction prompt to the chosen provider and
 * returns the JSON schema text (already stripped of any prose/code fences).
 * The user's key never leaves their machine except in this request.
 */
export async function reconstruct(params: ReconstructParams): Promise<string> {
  const prompt = buildReconstructionPrompt(
    params.width && params.height ? { width: params.width, height: params.height } : {}
  );

  let text: string;
  switch (params.provider) {
    case "openai":
      text = await callChatCompletions({ url: OPENAI_URL, label: "OpenAI", tokenField: "max_completion_tokens" }, params, prompt);
      break;
    case "gemini":
      text = await callGemini(params, prompt);
      break;
    default:
      text = await callAnthropic(params, prompt);
  }

  if (!text || !text.trim()) {
    throw new Error("The model returned an empty response.");
  }
  return extractJson(text);
}
