// The one seam between Open Grok Bot and any agent harness
// (Claude Code, Codex, Pi, ...). Each adapter implements `Harness`.
// NOTE: "Open Grok Bot" is a working name. We rename before release (see README).

export type HarnessId = "claude-code" | "codex" | (string & {});

export interface HarnessCapabilities {
  resume: boolean; // can continue a native session by id
  mcp: boolean; // can load our MCP tool server
  approvalHook: boolean; // lets us allow or deny each tool call before it runs
  midRunInput: boolean; // accepts new user messages during a run
  images: boolean;
}

export type McpServerConfig =
  | { type: "http"; url: string; headers?: Record<string, string> }
  | { type: "stdio"; command: string; args?: string[]; env?: Record<string, string> };

export interface RunRequest {
  runId: string;
  botId: string;
  prompt: string;
  systemPrompt: string;
  cwd: string; // inside the computer, usually /workspace
  model?: string;
  sessionId?: string; // resume this native session
  mcpServers: Record<string, McpServerConfig>;
  signal: AbortSignal;
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export type ApprovalDecision =
  | { allow: true; input?: unknown } // input may be rewritten (e.g. vault refs)
  | { allow: false; reason: string };

export interface RunHooks {
  // Called before each tool call when `approvalHook` is supported.
  onToolCall(call: ToolCall): Promise<ApprovalDecision>;
}

export type HarnessEvent =
  | { type: "session"; sessionId: string }
  | { type: "text"; delta: string }
  | { type: "thinking"; delta: string }
  | { type: "tool_call"; call: ToolCall }
  | { type: "tool_result"; id: string; output: unknown; isError: boolean }
  | { type: "usage"; inputTokens: number; outputTokens: number; costUsd?: number }
  | { type: "done"; reason: "end" | "cancelled" | "max_turns" }
  | { type: "error"; message: string };

export interface Harness {
  id: HarnessId;
  capabilities: HarnessCapabilities;
  run(req: RunRequest, hooks: RunHooks): AsyncIterable<HarnessEvent>;
  send?(runId: string, message: string): Promise<void>; // when midRunInput
}
