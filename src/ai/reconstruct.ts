import type { AiProvider } from "../messages";
import { buildReconstructionPrompt } from "../prompt/buildReconstructionPrompt";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
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

/** OpenAI Chat Completions API (supports browser CORS with a bearer token). */
async function callOpenAI(params: ReconstructParams, prompt: string): Promise<string> {
  const dataUrl = `data:${params.mediaType};base64,${params.base64}`;
  const response = await postJson(
    OPENAI_URL,
    {
      "content-type": "application/json",
      authorization: `Bearer ${params.apiKey}`
    },
    {
      model: params.model,
      max_completion_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ]
    },
    "OpenAI"
  );

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await errorDetail(response)}`);
  }

  const data = await response.json();
  const choice = Array.isArray(data.choices) ? data.choices[0] : undefined;
  const content = choice && choice.message ? choice.message.content : "";
  return typeof content === "string" ? content : "";
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

  const text = params.provider === "openai" ? await callOpenAI(params, prompt) : await callAnthropic(params, prompt);

  if (!text || !text.trim()) {
    throw new Error("The model returned an empty response.");
  }
  return extractJson(text);
}
