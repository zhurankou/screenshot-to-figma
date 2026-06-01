import { createFrameFromSchema } from "./figma/createFrame";
import type { AiProvider, PluginToUiMessage, UiToPluginMessage } from "./messages";
import { validateSchema } from "./schema/validateSchema";

const STORAGE_KEYS: Record<AiProvider, string> = {
  anthropic: "anthropic-api-key",
  openai: "openai-api-key",
  openrouter: "openrouter-api-key",
  gemini: "gemini-api-key"
};

figma.showUI(__html__, { width: 420, height: 640, themeColors: true });

function post(message: PluginToUiMessage): void {
  figma.ui.postMessage(message);
}

async function handleCreateFrame(
  schema: unknown,
  options: { includeReference: boolean; group: boolean; debugLabels: boolean },
  imageBytes?: Uint8Array
): Promise<void> {
  // Re-validate on the plugin side as a safety net: never trust the UI blindly.
  const result = validateSchema(schema);
  if (!result.valid || !result.schema) {
    const detail = result.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`Schema is invalid: ${detail || "unknown reason"}.`);
  }

  const summary = await createFrameFromSchema({ schema: result.schema, options, imageBytes });
  summary.skipped = result.stats.skipped;
  for (const warning of result.warnings) {
    if (!summary.warnings.includes(warning.message)) {
      summary.warnings.push(warning.message);
    }
  }

  post({ type: "RENDER_COMPLETE", summary });
  const warnSuffix = summary.warnings.length > 0 ? ` (${summary.warnings.length} warning(s))` : "";
  figma.notify(`Created "${summary.frameName}" with ${summary.created} layer(s)${warnSuffix}.`);
}

figma.ui.onmessage = async (message: UiToPluginMessage) => {
  if (!message) {
    return;
  }

  if (message.type === "GET_API_KEYS") {
    const keys: Record<AiProvider, string> = { anthropic: "", openai: "", openrouter: "", gemini: "" };
    const providers = Object.keys(STORAGE_KEYS) as AiProvider[];
    await Promise.all(
      providers.map(async (provider) => {
        const value = (await figma.clientStorage.getAsync(STORAGE_KEYS[provider])) as string | undefined;
        keys[provider] = value || "";
      })
    );
    post({ type: "API_KEYS", keys });
    return;
  }

  if (message.type === "SAVE_API_KEY") {
    await figma.clientStorage.setAsync(STORAGE_KEYS[message.provider], message.key);
    return;
  }

  if (message.type === "CREATE_FRAME") {
    try {
      await handleCreateFrame(message.schema, message.options, message.imageBytes);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown plugin error.";
      post({ type: "RENDER_ERROR", message: text });
      figma.notify(`Screenshot to Figma failed: ${text}`, { error: true });
    }
  }
};
