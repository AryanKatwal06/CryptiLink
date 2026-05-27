export type DiagnosticPayload = Record<string, unknown>;

export function logDiagnostic(event: string, payload: DiagnosticPayload = {}): void {
  const serialized = Object.keys(payload).length > 0 ? ` ${JSON.stringify(payload)}` : '';
  console.log(`[PaySys][Diagnostics] ${event}${serialized}`);
}