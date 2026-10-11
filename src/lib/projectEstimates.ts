import type { Recommendation } from './projectAnalysis';

export type PlanningEstimate = { monthly_min_usd: number; monthly_max_usd: number; region: string; basis: string; assumptions: string[]; generated_at?: string; kind: 'ai_estimate' };
export function serviceEstimate(r: Recommendation) {
  const e = r.suggested_configuration.cost_estimate;
  if (e && Number.isFinite(e.monthly_min_usd) && Number.isFinite(e.monthly_max_usd) && e.monthly_min_usd >= 0 && e.monthly_max_usd >= e.monthly_min_usd)
    return { min: e.monthly_min_usd, max: e.monthly_max_usd, basis: e.basis, region: e.region, assumptions: e.assumptions, kind: 'ai_estimate' as const };
  if (r.estimated_monthly_min_usd != null && r.estimated_monthly_max_usd != null && Number.isFinite(Number(r.estimated_monthly_min_usd)) && Number.isFinite(Number(r.estimated_monthly_max_usd)) && Number(r.estimated_monthly_min_usd) >= 0 && Number(r.estimated_monthly_max_usd) >= Number(r.estimated_monthly_min_usd))
    return { min: Number(r.estimated_monthly_min_usd), max: Number(r.estimated_monthly_max_usd), basis: 'Estimación registrada con referencia: ' + (r.pricing_reference_url ?? 'sin referencia'), region: r.region ?? 'Por definir', assumptions: r.assumptions, kind: 'recorded' as const };
  return null;
}
