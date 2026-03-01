/**
 * webtau/diagnostics — Structured error envelope for all webtau failures.
 *
 * Every failure surface from invoke(), configure(), and provider paths
 * throws a WebtauError instead of a plain Error, enabling callers to
 * programmatically inspect and handle failure categories.
 */

export type DiagnosticCode =
  | "NO_WASM_CONFIGURED"
  | "UNKNOWN_COMMAND"
  | "LOAD_FAILED"
  | "PROVIDER_ERROR"
  | "PROVIDER_MISSING";

export interface DiagnosticEnvelope {
  /** Machine-readable failure category. */
  code: DiagnosticCode;
  /** Which runtime path produced this error: "wasm", "tauri", "provider", or "unknown". */
  runtime: string;
  /** The command name that was invoked when the error occurred, if any. */
  command: string;
  /** Human-readable description of the failure. */
  message: string;
  /** Remediation hint for the developer. */
  hint: string;
}

export class WebtauError extends Error implements DiagnosticEnvelope {
  readonly code: DiagnosticCode;
  readonly runtime: string;
  readonly command: string;
  readonly hint: string;

  constructor(envelope: DiagnosticEnvelope) {
    super(envelope.message);
    this.name = "WebtauError";
    this.code = envelope.code;
    this.runtime = envelope.runtime;
    this.command = envelope.command;
    this.hint = envelope.hint;
  }
}
