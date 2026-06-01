import { reconstruct } from "./ai/reconstruct";
import type { AiProvider, PluginToUiMessage, RenderOptions, RenderSummary } from "./messages";
import { validateSchema } from "./schema/validateSchema";

const fileInput = document.querySelector<HTMLInputElement>("#fileInput")!;
const chooseFile = document.querySelector<HTMLButtonElement>("#chooseFile")!;
const dropZone = document.querySelector<HTMLElement>("#dropZone")!;
const fileMeta = document.querySelector<HTMLElement>("#fileMeta")!;
const preview = document.querySelector<HTMLImageElement>("#preview")!;
const providerSelect = document.querySelector<HTMLSelectElement>("#provider")!;
const apiKeyInput = document.querySelector<HTMLInputElement>("#apiKey")!;
const keyHint = document.querySelector<HTMLElement>("#keyHint")!;
const modelInput = document.querySelector<HTMLInputElement>("#model")!;
const recreate = document.querySelector<HTMLButtonElement>("#recreate")!;
const schemaInput = document.querySelector<HTMLTextAreaElement>("#schemaInput")!;
const createFromSchema = document.querySelector<HTMLButtonElement>("#createFromSchema")!;
const progress = document.querySelector<HTMLElement>("#progress")!;
const progressText = document.querySelector<HTMLElement>("#progressText")!;
const errorEl = document.querySelector<HTMLElement>("#error")!;
const summaryEl = document.querySelector<HTMLElement>("#summary")!;

// Generated layers always sit above a locked screenshot reference, grouped.
const OPTIONS: RenderOptions = { includeReference: true, group: true, debugLabels: false };

const DEFAULT_MODEL: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  gemini: "gemini-2.5-flash"
};
const KEY_PLACEHOLDER: Record<AiProvider, string> = {
  anthropic: "sk-ant-...",
  openai: "sk-...",
  gemini: "AIza..."
};
const KEY_HINT: Record<AiProvider, string> = {
  anthropic: "Stored locally on this machine. Get one at console.anthropic.com. Calls are billed to your key.",
  openai: "Stored locally on this machine. Get one at platform.openai.com. Calls are billed to your key.",
  gemini: "Stored locally. Free key at aistudio.google.com/apikey. The free tier has rate limits."
};
const PROVIDER_LABEL: Record<AiProvider, string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  gemini: "Gemini"
};

const keys: Record<AiProvider, string> = { anthropic: "", openai: "", gemini: "" };

let imageBytes: Uint8Array | null = null;
let imageBase64 = "";
let imageMediaType = "";
let imageWidth = 0;
let imageHeight = 0;

function provider(): AiProvider {
  const value = providerSelect.value;
  if (value === "openai" || value === "gemini") {
    return value;
  }
  return "anthropic";
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function showError(message: string): void {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function clearError(): void {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function showProgress(message: string): void {
  progressText.textContent = message;
  progress.classList.remove("hidden");
}

function hideProgress(): void {
  progress.classList.add("hidden");
}

function updateButton(): void {
  recreate.disabled = !imageBytes || apiKeyInput.value.trim().length === 0;
}

function applyProviderUi(): void {
  const p = provider();
  apiKeyInput.value = keys[p];
  apiKeyInput.placeholder = KEY_PLACEHOLDER[p];
  keyHint.textContent = KEY_HINT[p];
  modelInput.value = DEFAULT_MODEL[p];
  updateButton();
}

function showResult(summary: RenderSummary): void {
  const counts = Object.entries(summary.byType)
    .map(([type, n]) => `<li>${escapeHtml(type)}: ${n}</li>`)
    .join("");
  const warnings =
    summary.warnings.length > 0
      ? `<p class="warn">Warnings:</p><ul class="issues">${summary.warnings
          .map((w) => `<li>${escapeHtml(w)}</li>`)
          .join("")}</ul>`
      : "";
  summaryEl.innerHTML = `
    <h2>Created "${escapeHtml(summary.frameName)}"</h2>
    <dl>
      <dt>Layers</dt><dd>${summary.created}</dd>
      <dt>Frame size</dt><dd>${summary.width} x ${summary.height}</dd>
    </dl>
    <ul class="counts">${counts}</ul>
    ${warnings}
  `;
  summaryEl.classList.remove("hidden");
}

function readImage(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (typeof result !== "string") {
      return;
    }
    preview.src = result;
    preview.classList.remove("hidden");

    // Split "data:image/png;base64,XXXX" into media type + payload.
    const comma = result.indexOf(",");
    const header = result.slice(0, comma);
    imageBase64 = result.slice(comma + 1);
    const match = header.match(/data:([^;]+)/);
    imageMediaType = match ? match[1] : file.type;

    const probe = new Image();
    probe.onload = () => {
      imageWidth = probe.naturalWidth;
      imageHeight = probe.naturalHeight;
      fileMeta.textContent = `${file.name} — ${imageWidth} x ${imageHeight}px`;
    };
    probe.src = result;
  };
  reader.readAsDataURL(file);

  const bytesReader = new FileReader();
  bytesReader.onload = () => {
    imageBytes = new Uint8Array(bytesReader.result as ArrayBuffer);
    updateButton();
  };
  bytesReader.readAsArrayBuffer(file);
}

function handleFile(file: File): void {
  if (file.type !== "image/png" && file.type !== "image/jpeg") {
    showError("Choose a PNG or JPG screenshot.");
    return;
  }
  clearError();
  summaryEl.classList.add("hidden");
  imageBytes = null;
  imageBase64 = "";
  imageWidth = 0;
  imageHeight = 0;
  updateButton();
  readImage(file);
}

async function run(): Promise<void> {
  if (!imageBytes || !imageBase64) {
    showError("Choose a screenshot first.");
    return;
  }
  const p = provider();
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim();
  if (!apiKey) {
    showError("Enter your API key.");
    return;
  }
  if (!model) {
    showError("Enter a model name.");
    return;
  }

  clearError();
  summaryEl.classList.add("hidden");
  recreate.disabled = true;
  keys[p] = apiKey;
  parent.postMessage({ pluginMessage: { type: "SAVE_API_KEY", provider: p, key: apiKey } }, "*");

  try {
    showProgress(`Asking ${PROVIDER_LABEL[p]} to reconstruct the screenshot…`);
    const json = await reconstruct({
      provider: p,
      apiKey,
      model,
      mediaType: imageMediaType,
      base64: imageBase64,
      width: imageWidth,
      height: imageHeight
    });

    showProgress("Validating the generated schema…");
    const result = validateSchema(json);
    if (!result.valid || !result.schema) {
      const detail = result.errors
        .slice(0, 4)
        .map((e) => `${e.path}: ${e.message}`)
        .join("; ");
      throw new Error(`The model returned an invalid schema (${detail}). Try again.`);
    }

    showProgress("Building Figma layers…");
    parent.postMessage(
      {
        pluginMessage: {
          type: "CREATE_FRAME",
          schema: result.schema,
          options: OPTIONS,
          imageBytes
        }
      },
      "*"
    );
  } catch (error) {
    hideProgress();
    recreate.disabled = false;
    showError(error instanceof Error ? error.message : "Something went wrong.");
  }
}

/** Keyless path: render a pasted schema directly, no API call. */
function buildFromPastedSchema(): void {
  const text = schemaInput.value.trim();
  if (!text) {
    showError("Paste a UI schema JSON first.");
    return;
  }
  const result = validateSchema(text);
  if (!result.valid || !result.schema) {
    const detail = result.errors
      .slice(0, 4)
      .map((e) => `${e.path}: ${e.message}`)
      .join("; ");
    showError(`Invalid schema: ${detail}`);
    return;
  }

  clearError();
  summaryEl.classList.add("hidden");
  showProgress("Building Figma layers…");
  parent.postMessage(
    {
      pluginMessage: {
        type: "CREATE_FRAME",
        schema: result.schema,
        options: OPTIONS,
        imageBytes: imageBytes || undefined
      }
    },
    "*"
  );
}

// --- Wiring -----------------------------------------------------------------

chooseFile.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const [file] = Array.from(fileInput.files || []);
  if (file) {
    handleFile(file);
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  const [file] = Array.from(event.dataTransfer ? event.dataTransfer.files : []);
  if (file) {
    handleFile(file);
  }
});

providerSelect.addEventListener("change", applyProviderUi);
apiKeyInput.addEventListener("input", () => {
  keys[provider()] = apiKeyInput.value;
  updateButton();
});
recreate.addEventListener("click", () => void run());
createFromSchema.addEventListener("click", buildFromPastedSchema);

window.onmessage = (event: MessageEvent<{ pluginMessage: PluginToUiMessage }>) => {
  const message = event.data.pluginMessage;
  if (!message) {
    return;
  }
  if (message.type === "API_KEYS") {
    keys.anthropic = message.keys.anthropic;
    keys.openai = message.keys.openai;
    keys.gemini = message.keys.gemini;
    apiKeyInput.value = keys[provider()];
    updateButton();
  }
  if (message.type === "RENDER_COMPLETE") {
    hideProgress();
    recreate.disabled = false;
    showResult(message.summary);
  }
  if (message.type === "RENDER_ERROR") {
    hideProgress();
    recreate.disabled = false;
    showError(message.message);
  }
};

// Initialize provider-specific UI, then ask the controller for stored keys.
applyProviderUi();
parent.postMessage({ pluginMessage: { type: "GET_API_KEYS" } }, "*");
