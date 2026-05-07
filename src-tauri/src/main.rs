// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::process::Command;
#[cfg(windows)]
use std::os::windows::process::CommandExt;
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

/// Filter out noisy system warnings and hook failures to show the real error
fn clean_error_message(raw: &str) -> String {
    let mut lines: Vec<&str> = Vec::new();
    let noise_patterns = [
        "Unexpected token",
        "Hook execution",
        "Hook system message",
        "CategoryInfo",
        "FullyQualifiedErrorId",
        "Warning: Windows 10 detected",
        "Warning: 256-color support",
        "claude-mem",
        "hook",
        "bun.exe",
    ];

    for line in raw.lines() {
        let is_noise = noise_patterns.iter().any(|p| line.contains(p));
        if !is_noise && !line.trim().is_empty() {
            lines.push(line.trim());
        }
    }

    if lines.is_empty() {
        return raw.to_string();
    }
    lines.join("\n")
}

///// Helper to spawn a command correctly on Windows (.cmd/.ps1) and Unix
fn spawn_command(binary: &str) -> Command {
    let mut cmd = if cfg!(windows) {
        let mut c = Command::new("cmd");
        c.arg("/c").arg(binary);
        #[cfg(windows)]
        c.creation_flags(0x08000000); // CREATE_NO_WINDOW
        c
    } else {
        Command::new(binary)
    };

    // Common environment cleanup
    cmd.env("GEMINI_CLI_TRUST_WORKSPACE", "true");
    cmd.env("NODE_OPTIONS", "");
    cmd.env("NODE_PATH", "");
    cmd.env("CI", "true");

    // Platform-aware Node.js path discovery
    let node_search = if cfg!(windows) {
        Command::new("where").arg("node").output()
    } else {
        Command::new("which").arg("node").output()
    };

    if let Ok(output) = node_search {
        if let Ok(path_str) = String::from_utf8(output.stdout) {
            if let Some(first_path) = path_str.lines().next() {
                if let Some(node_dir) = std::path::Path::new(first_path).parent() {
                    if let Some(existing_path) = std::env::var_os("PATH") {
                        let mut paths = std::env::split_paths(&existing_path).collect::<Vec<_>>();
                        paths.insert(0, node_dir.to_path_buf());
                        if let Ok(new_path) = std::env::join_paths(paths) {
                            cmd.env("PATH", new_path);
                        }
                    }
                }
            }
        }
    }

    cmd
}

/// Check if a CLI tool is available by running `<name> --version`
#[tauri::command]
fn check_cli(name: String) -> CliStatus {
    let binary = match name.as_str() {
        "claude" => "claude",
        "codex" => "codex",
        "gemini" => "gemini",
        _ => return CliStatus { available: false, version: String::new(), name },
    };

    // Primary attempt
    let mut result = spawn_command(binary).arg("--version").output();

    // Fallback for Windows: Use powershell if primary failed
    #[cfg(windows)]
    if result.is_err() || !result.as_ref().unwrap().status.success() {
        let mut ps_cmd = Command::new("powershell");
        ps_cmd.args(["-Command", &format!("{} --version", binary)]);
        ps_cmd.creation_flags(0x08000000);
        result = ps_cmd.output();
    }

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
        "Generate a social media image based on this description: '{}'

IMPORTANT RULES:
1. Save the final image as a PNG file to exactly this path: '{}'
2. The image should be high quality, suitable for social media (1080x1080 or similar).
3. Do NOT ask any follow-up questions. Just generate and save the image.",
        user_prompt.replace("'", ""), output_path
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

    // Resolve full path for logging
    let full_output_path = fs::canonicalize(&out_dir)
        .unwrap_or_else(|_| out_dir.clone())
        .join(&filename);
    let full_output_path_str = full_output_path.to_string_lossy().to_string();

    println!("[CLI] Generating image with {}...", cli);
    println!("[CLI] Output path: {}", full_output_path_str);

    // Build command based on CLI
    let mut result = match cli.as_str() {
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
                    "--skip-trust",
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

    // Fallback for Windows: Try via PowerShell if primary failed
    #[cfg(windows)]
    if result.is_err() || !result.as_ref().unwrap().status.success() {
        let ps_cmd = match cli.as_str() {
            "claude" => format!("claude -p \"{}\" --allowedTools \"Bash(command:*),Read,Write\" --output-format text", full_prompt.replace("\"", "`\"")),
            "codex" => format!("codex exec --quiet --approval-mode full-auto \"{}\"", full_prompt.replace("\"", "`\"")),
            "gemini" => format!("gemini -p \"{}\" --yolo --skip-trust", full_prompt.replace("\"", "`\"")),
            _ => String::new(),
        };

        if !ps_cmd.is_empty() {
            let mut ps_runner = Command::new("powershell");
            ps_runner.args(["-Command", &ps_cmd]);
            ps_runner.creation_flags(0x08000000);

            if let Ok(ps_result) = ps_runner.output() {
                if ps_result.status.success() {
                    result = Ok(ps_result);
                }
            }
        }
    }

    match result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            
            println!("[CLI] Finished with status: {}", output.status);
            println!("[CLI] Raw Stdout: {}", stdout);
            println!("[CLI] Raw Stderr: {}", stderr);

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
                let combined_err = format!("STDOUT:\n{}\n\nSTDERR:\n{}", stdout, stderr);
                let cleaned_err = clean_error_message(&combined_err);
                
                let error_msg = if !cleaned_err.is_empty() {
                    format!("CLI Error: {}", cleaned_err.chars().take(1000).collect::<String>())
                } else if !combined_err.trim().is_empty() {
                    format!("CLI Failed (Raw Output): {}", combined_err.chars().take(1000).collect::<String>())
                } else {
                    "CLI failed with no output captured.".to_string()
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
