import type { TraceStep, TraceStatus } from '../types';

export class WorkflowTrace {
  private readonly startedAt = Date.now();
  readonly steps: TraceStep[] = [];
  readonly warnings: string[] = [];

  step(id: string, label: string, detail: string, status: TraceStatus = 'complete', durationMs?: number) {
    this.steps.push({ id, label, detail, status, durationMs });
    if (status === 'warning') this.warnings.push(detail);
  }

  warn(id: string, label: string, detail: string, durationMs?: number) {
    this.step(id, label, detail, 'warning', durationMs);
  }

  fail(id: string, label: string, detail: string, durationMs?: number) {
    this.step(id, label, detail, 'error', durationMs);
  }

  durationMs() {
    return Date.now() - this.startedAt;
  }
}

export function measure<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  return fn().then((result) => ({ result, durationMs: Date.now() - start }));
}
