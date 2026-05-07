import { invoke } from "@tauri-apps/api/tauri";
import { fetch, Body, ResponseType } from "@tauri-apps/api/http";

const STORAGE_KEYS = {
  URL: "comfy_url",
  TOKEN: "comfy_token",
  USER: "comfy_user",
};

/**
 * Service to interact with a local ComfyUI Orchestration Server
 */
export const comfyService = {
  /**
   * Get stored connection details
   */
  getConnection() {
    return {
      url: localStorage.getItem(STORAGE_KEYS.URL) || "http://192.168.1.196:8000",
      token: localStorage.getItem(STORAGE_KEYS.TOKEN),
      user: JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "null"),
    };
  },

  /**
   * Save connection details
   */
  saveConnection(url, token, user) {
    if (url) localStorage.setItem(STORAGE_KEYS.URL, url);
    if (token) localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  /**
   * Clear connection details
   */
  disconnect() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  /**
   * Register a new user
   */
  async register(baseUrl, email, password) {
    const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      body: Body.json({ email, password }),
      responseType: ResponseType.JSON,
    });

    if (!response.ok) {
      throw new Error(response.data?.detail || "Failed to register");
    }

    return response.data;
  },

  /**
   * Login to get a token
   */
  async login(baseUrl, email, password) {
    const response = await fetch(`${baseUrl}/api/v1/auth/token`, {
      method: "POST",
      body: Body.form({
        username: email,
        password: password,
      }),
      responseType: ResponseType.JSON,
    });

    if (!response.ok) {
      throw new Error(response.data?.detail || "Failed to login");
    }

    const data = response.data;
    const userData = await this.getMe(baseUrl, data.access_token);
    
    this.saveConnection(baseUrl, data.access_token, userData);
    return { token: data.access_token, user: userData };
  },

  /**
   * Get current user info
   */
  async getMe(baseUrl, token) {
    const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` },
      responseType: ResponseType.JSON,
    });
    if (!response.ok) throw new Error("Unauthorized");
    return response.data;
  },

  /**
   * Verify server health
   */
  async checkHealth(baseUrl) {
    try {
      return await invoke("check_server_health", { url: `${baseUrl}/api/v1/monitoring/jobs/counts` });
    } catch (e) {
      return false;
    }
  },

  /**
   * Queue and poll for image generation
   */
  async generateImage(prompt, options = {}, onProgress) {
    const { url, token } = this.getConnection();
    if (!url || !token) throw new Error("Not connected to ComfyUI");

    const { width = 1080, height = 1920 } = options;

    // 1. Submit to queue
    const response = await fetch(`${url}/api/v1/generation/queue`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: Body.json({
        parameters: { 
          prompt, 
          seed: Math.floor(Math.random() * 1000000000000000),
          width,
          height
        }
      }),
      responseType: ResponseType.JSON,
    });

    if (!response.ok) {
      throw new Error(response.data?.detail || "Failed to queue generation");
    }

    const queueData = response.data;
    const job = queueData.job || queueData;
    const jobId = job.job_id;

    if (!jobId) {
      console.error("[ComfyUI] No job_id in response:", queueData);
      throw new Error("Server did not return a job ID");
    }

    console.log("[ComfyUI] Job queued:", jobId);
    if (onProgress) onProgress("queued", 0);

    // 2. Poll for status using the recommended logic
    const terminalStatuses = new Set(["completed", "failed", "cancelled"]);
    const activeStatuses = new Set(["queued", "running", "retrying"]);
    
    const startedAt = Date.now();
    const timeoutMs = 10 * 60 * 1000; // 10 minutes
    let attempts = 0;

    const poll = async () => {
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error("Generation timed out while polling.");
      }

      attempts++;
      const res = await fetch(`${url}/api/v1/generation/jobs/${jobId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` },
        responseType: ResponseType.JSON,
      });
      
      if (!res.ok) throw new Error(`Job polling failed: ${res.status}`);
      
      const data = res.data;
      const jobData = data.job || data;
      const status = (jobData.status || "").toLowerCase();
      
      console.log(`[ComfyUI] Poll #${attempts}: ${status}`, jobData);

      if (terminalStatuses.has(status)) {
        if (status === "completed") {
          let imageUrl = jobData.outputs?.[0]?.url;
          if (!imageUrl) {
            // Edge case: status is completed but outputs aren't ready yet
            console.warn("[ComfyUI] Job completed but no outputs found. Retrying...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            return poll();
          }

          // Handle relative URLs
          if (imageUrl.startsWith("/")) {
            imageUrl = `${url}${imageUrl}`;
          }

          if (onProgress) onProgress("completed", 100);

          // Download and save locally
          const filename = `comfy_${Date.now()}.png`;
          const localPath = await invoke("save_comfy_image", {
            url: imageUrl,
            authToken: token,
            filename
          });
          
          return localPath;
        } else {
          // failed or cancelled
          throw new Error(jobData.error || `Job ${status}`);
        }
      }

      if (!activeStatuses.has(status)) {
        console.warn(`[ComfyUI] Unknown status: ${status}. Continuing to poll...`);
      }

      // Update progress in UI
      if (onProgress) {
        onProgress(status, Math.min(95, 5 + (attempts * 1.5)));
      }

      // Wait 2 seconds and poll again
      await new Promise(resolve => setTimeout(resolve, 2000));
      return poll();
    };

    return await poll();
  }
};
