export type TraceStatus = 'complete' | 'warning' | 'error';

export interface TraceStep {
  id: string;
  label: string;
  status: TraceStatus;
  detail: string;
  durationMs?: number;
}

export interface WorkflowEnvelope<TOutput> {
  success: boolean;
  workflow: string;
  input: Record<string, unknown>;
  output?: TOutput;
  trace: TraceStep[];
  warnings: string[];
  error?: string;
  metadata: {
    generatedAt: string;
    durationMs: number;
    model?: string;
    [key: string]: unknown;
  };
}

export interface AgentInputBase {
  demoMode?: boolean;
}
