export type ProjectFlow = {
  version: 1; summary: string; assumptions: string[];
  nodes: { id: string; stage: string; description: string }[];
  edges: { source: string; target: string; label: string; kind: string; explanation: string; requirement_ids: string[]; assumed: boolean }[];
};
