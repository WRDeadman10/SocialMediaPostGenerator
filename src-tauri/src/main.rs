// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::PathBuf;
use std::fs;

#[derive(Serialize, Deserialize)]
struct CliStatus {
    available: bool,
    version: String,
    name: String,
}

#[derive(Serialize, Deserialize)]
struct GenerateResult {
    success: bool,
    image_path: String,
    image_base64: String,
    error: String,
}

/// Helper to spawn a command correctly on Windows (.cmd/.ps1) and Unix
fn spawn_command(binary: &str) -> Command {
    if cfg!(windows) {
        let mut cmd = Command::new("cmd");
        cmd.arg("/c").arg(binary);
        cmd
    } else {
        Command::new(binary)
    }
}

/// Check if a CLI tool is available by running `<name> --version`
#[tauri::command]
fn check_cli(name: String) -> CliStatus {
    let binary = match name.as_str() {
        "claude" => "claude",
        "codex" => "codex",
        "gemini" => "gemini",
        _ => {
            return CliStatus {
                available: false,
                version: String::new(),
                name,
            }
        }
    };

    // Try running --version
    let result = spawn_command(binary)
        .arg("--version")
        .output();

    match result {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let version_text = if !stdout.is_empty() { stdout } else { stderr };

            CliStatus {
                available: true,
                version: version_text.lines().next().unwrap_or("installed").to_string(),
                name,
            }
        }
        _ => CliStatus {
            available: false,
            version: String::new(),
            name,
        },
    }
}

/// Build the wrapped prompt that instructs the CLI agent to generate an image
fn build_generation_prompt(user_prompt: &str, output_path: &str) -> String {
    format!(
        r#"Generate a social media image based on this description: {}

Use your available tools to create the image. You may use any image generation API, library, or tool available to you.

IMPORTANT RULES:
1. Save the final image as a PNG file to exactly this path: {}
2. The image should be high quality, suitable for social media (1080x1080 or similar).
3. After saving, output ONLY the text "IMAGE_SAVED" on a new line and nothing else after it.
4. Do NOT ask any follow-up questions. Just generate and save the image."#,
        user_prompt, output_path
    )
}

/// Run a CLI tool to generate an image from a prompt
#[tauri::command]
async fn run_cli_generate(cli: String, prompt: String, output_dir: String) -> GenerateResult {
    // Create output directory if it doesn't exist
    let out_dir = PathBuf::from(&output_dir);
    if let Err(e) = fs::create_dir_all(&out_dir) {
        return GenerateResult {
            success: false,
            image_path: String::new(),
            image_base64: String::new(),
            error: format!("Failed to create output directory: {}", e),
        };
    }

    // Generate unique filename
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let filename = format!("generated_{}.png", timestamp);
    let output_path = out_dir.join(&filename);
    let output_path_str = output_path.to_string_lossy().to_string();

    // Build the wrapped prompt
    let full_prompt = build_generation_prompt(&prompt, &output_path_str);

    // Build command based on CLI
    let result = match cli.as_str() {
        "claude" => {
            spawn_command("claude")
                .args([
                    "-p",
                    &full_prompt,
                    "--allowedTools",
                    "Bash(command:*),Read,Write",
                    "--output-format",
                    "text",
                ])
                .output()
        }
        "codex" => {
            spawn_command("codex")
                .args([
                    "exec",
                    "--quiet",
                    "--approval-mode",
                    "full-auto",
                    &full_prompt,
                ])
                .output()
        }
        "gemini" => {
            spawn_command("gemini")
                .args([
                    "-p",
                    &full_prompt,
                    "--yolo",
                ])
                .output()
        }
        _ => {
            return GenerateResult {
                success: false,
                image_path: String::new(),
                image_base64: String::new(),
                error: format!("Unknown CLI: {}", cli),
            };
        }
    };

    match result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();

            // Check if the image file was created
            if output_path.exists() {
                // Read the image and encode as base64
                match fs::read(&output_path) {
                    Ok(bytes) => {
                        use base64::Engine;
                        let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
                        let data_url = format!("data:image/png;base64,{}", encoded);

                        GenerateResult {
                            success: true,
                            image_path: output_path_str,
                            image_base64: data_url,
                            error: String::new(),
                        }
                    }
                    Err(e) => GenerateResult {
                        success: false,
                        image_path: output_path_str,
                        image_base64: String::new(),
                        error: format!("Image file created but could not be read: {}", e),
                    },
                }
            } else {
                // Image wasn't created — return CLI output as error context
                let error_msg = if !stderr.is_empty() {
                    format!("CLI completed but no image was saved.\nStdout: {}\nStderr: {}", 
                        stdout.chars().take(500).collect::<String>(),
                        stderr.chars().take(500).collect::<String>())
                } else {
                    format!("CLI completed but no image was saved.\nOutput: {}", 
                        stdout.chars().take(1000).collect::<String>())
                };

                GenerateResult {
                    success: false,
                    image_path: String::new(),
                    image_base64: String::new(),
                    error: error_msg,
                }
            }
        }
        Err(e) => GenerateResult {
            success: false,
            image_path: String::new(),
            image_base64: String::new(),
            error: format!("Failed to execute CLI '{}': {}", cli, e),
        },
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![check_cli, run_cli_generate])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
