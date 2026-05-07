/**
 * CLI Service — abstraction for detecting and invoking CLI tools
 * Works in both Tauri (desktop) and web (browser) environments.
 */

const CLI_TOOLS = [
  {
    id: "claude",
    name: "Claude Code",
    binary: "claude",
    installCmd: "npm i -g @anthropic-ai/claude-code",
    authNote: null, // No API key needed
  },
  {
    id: "codex",
    name: "Codex",
    binary: "codex",
    installCmd: "npm i -g @openai/codex",
    authNote: "Requires OPENAI_API_KEY environment variable.\nSet it with: set OPENAI_API_KEY=sk-your-key-here",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    binary: "gemini",
    installCmd: "npm i -g @google/gemini-cli",
    authNote: null, // Skipped for now
  },
];

/** Check if running inside Tauri */
export const isTauri = () => typeof window !== "undefined" && !!window.__TAURI__;

/**
 * Detect which CLI tools are available.
 * @returns {Promise<Array<{ id, name, binary, installCmd, authNote, available, version }>>}
 */
export async function detectCLIs() {
  if (!isTauri()) {
    // In web mode, all CLIs are unavailable (no shell access)
    return CLI_TOOLS.map((tool) => ({
      ...tool,
      available: false,
      version: "",
    }));
  }

  const { invoke } = await import("@tauri-apps/api/tauri");

  const results = await Promise.all(
    CLI_TOOLS.map(async (tool) => {
      try {
        const status = await invoke("check_cli", { name: tool.id });
        return {
          ...tool,
          available: status.available,
          version: status.version || "",
        };
      } catch (err) {
        console.warn(`Failed to check CLI "${tool.id}":`, err);
        return { ...tool, available: false, version: "" };
      }
    })
  );

  return results;
}

/**
 * Generate an image using a CLI tool.
 * @param {string} cli - CLI id ("claude" | "codex" | "gemini")
 * @param {string} prompt - User's image prompt
 * @returns {Promise<{ success: boolean, imageDataUrl: string, imagePath: string, error: string }>}
 */
export async function generateImage(cli, prompt) {
  if (!isTauri()) {
    return {
      success: false,
      imageDataUrl: "",
      imagePath: "",
      error: "Image generation requires the desktop app (Tauri). Web fallback not yet implemented.",
    };
  }

  const { invoke } = await import("@tauri-apps/api/tauri");

  // Use a temp directory for generated images
  let outputDir;
  try {
    const { appDataDir } = await import("@tauri-apps/api/path");
    const appData = await appDataDir();
    outputDir = `${appData}generated_images`;
  } catch {
    // Fallback to a relative path
    outputDir = "./generated_images";
  }

  try {
    const result = await invoke("run_cli_generate", {
      cli,
      prompt,
      outputDir: outputDir,
    });

    return {
      success: result.success,
      imageDataUrl: result.image_base64 || "",
      imagePath: result.image_path || "",
      error: result.error || "",
    };
  } catch (err) {
    return {
      success: false,
      imageDataUrl: "",
      imagePath: "",
      error: `Invoke error: ${err}`,
    };
  }
}

/** Get the list of CLI tool metadata (static info) */
export function getCLIToolList() {
  return CLI_TOOLS;
}

/** localStorage key for dismissing CLI warning */
const CLI_WARNING_DISMISSED_KEY = "smpg:cliWarningDismissed:v1";

/** Check if CLI warning was recently dismissed */
export function wasWarningDismissed() {
  try {
    const raw = localStorage.getItem(CLI_WARNING_DISMISSED_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - ts < sevenDays;
  } catch {
    return false;
  }
}

/** Mark CLI warning as dismissed */
export function dismissWarning() {
  try {
    localStorage.setItem(CLI_WARNING_DISMISSED_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}
