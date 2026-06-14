import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";

/**
 * CodeBuddyDirectExecutor — talks to https://www.codebuddy.ai/v2/chat/completions
 *
 * This is the *direct API key* flow (Bearer ck_xxx), as opposed to the OAuth
 * flow upstream provides under `codebuddy` (which targets copilot.tencent.com).
 *
 * Upstream codebuddy.ai/v2 is OpenAI-compatible BUT enforces two quirks
 * documented from production testing:
 *   1. `stream: true` is required — non-stream returns code 11101.
 *   2. At least one `role: "system"` message must be present in messages —
 *      otherwise upstream returns "Parse message failed: invalid request".
 *
 * This executor normalizes both quirks transparently so callers can issue
 * standard OpenAI chat.completions requests without remembering them.
 */
export class CodeBuddyDirectExecutor extends BaseExecutor {
  constructor() {
    super("codebuddy-direct", PROVIDERS["codebuddy-direct"]);
  }

  transformRequest(model, body /* , stream, credentials */) {
    // Force streaming — codebuddy.ai/v2 rejects non-stream with code 11101.
    body.stream = true;

    // Inject a default system message if caller didn't supply one.
    // codebuddy.ai/v2 rejects requests whose messages[] has no system role.
    if (Array.isArray(body.messages)) {
      const hasSystem = body.messages.some((m) => m && m.role === "system");
      if (!hasSystem) {
        body.messages = [
          { role: "system", content: "You are a helpful assistant." },
          ...body.messages,
        ];
      }
    }

    return body;
  }

  buildHeaders(credentials, stream = true) {
    const headers = {
      "Content-Type": "application/json",
      ...(this.config.headers || {}),
    };

    const token = credentials?.apiKey || credentials?.accessToken;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    if (stream) headers["Accept"] = "text/event-stream";
    return headers;
  }
}

export default CodeBuddyDirectExecutor;
