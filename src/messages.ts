import type { UISchema } from "./types/schema";

export interface RenderOptions {
  /** Place the original screenshot as a locked reference layer behind the result. */
  includeReference: boolean;
  /** Wrap the generated top-level layers in a single group. */
  group: boolean;
  /** Add small debug labels next to each generated node. */
  debugLabels: boolean;
}

export interface RenderSummary {
  frameName: string;
  width: number;
  height: number;
  /** Total nodes created in Figma (excluding the reference layer). */
  created: number;
  byType: Record<string, number>;
  /** Nodes dropped during validation (unsupported type, etc.). */
  skipped: number;
  warnings: string[];
}

/** UI -> plugin controller. */
export interface CreateFrameMessage {
  type: "CREATE_FRAME";
  schema: UISchema;
  options: RenderOptions;
  imageName?: string;
  /** Present only when `options.includeReference` is true. */
  imageBytes?: Uint8Array;
}

/** Which AI provider performs the reconstruction. */
export type AiProvider = "anthropic" | "openai" | "openrouter" | "gemini";

/** UI -> plugin: persist a provider's API key in clientStorage (local to this machine). */
export interface SaveApiKeyMessage {
  type: "SAVE_API_KEY";
  provider: AiProvider;
  key: string;
}

/** UI -> plugin: request all stored API keys on load. */
export interface GetApiKeysMessage {
  type: "GET_API_KEYS";
}

/** plugin -> UI: stored API keys per provider (empty string if none). */
export interface ApiKeysMessage {
  type: "API_KEYS";
  keys: Record<AiProvider, string>;
}

/** plugin controller -> UI. */
export interface RenderCompleteMessage {
  type: "RENDER_COMPLETE";
  summary: RenderSummary;
}

export interface RenderErrorMessage {
  type: "RENDER_ERROR";
  message: string;
}

export type UiToPluginMessage = CreateFrameMessage | SaveApiKeyMessage | GetApiKeysMessage;
export type PluginToUiMessage = RenderCompleteMessage | RenderErrorMessage | ApiKeysMessage;
