import type { AiProvider } from "../messages";
import { buildReconstructionPrompt } from "../prompt/buildReconstructionPrompt";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_TOKENS = 8192;

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
  return body.slice(start, end + 1);
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
  /** OpenAI uses max_completion_tokens; OpenRouter normalizes max_tokens. */
  tokenField: "max_tokens" | "max_completion_tokens";
  extraHeaders?: Record<string, string>;
}

/**
 * OpenAI-style Chat Completions request. Used for both OpenAI and OpenRouter,
 * which share the same wire format (and both allow browser calls with a bearer token).
 */
async function callChatCompletions(opts: ChatOptions, params: ReconstructParams, prompt: string): Promise<string> {
  const dataUrl = `data:${params.mediaType};base64,${params.base64}`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${params.apiKey}`
  };
  if (opts.extraHeaders) {
    for (const name in opts.extraHeaders) {
      headers[name] = opts.extraHeaders[name];
    }
  }

  const body: Record<string, unknown> = {
    model: params.model,
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
      generationConfig: { maxOutputTokens: MAX_TOKENS }
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
    case "openrouter":
      text = await callChatCompletions(
        { url: OPENROUTER_URL, label: "OpenRouter", tokenField: "max_tokens", extraHeaders: { "X-Title": "Screenshot to Figma" } },
        params,
        prompt
      );
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
