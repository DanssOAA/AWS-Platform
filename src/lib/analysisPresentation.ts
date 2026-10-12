import { serviceEstimate } from './projectEstimates';
import type { AnalysisDetail, AnalysisRun } from './projectAnalysis';

export const analysisLabels: Record<string, string> = {
  unknown: 'Sin evaluar', low: 'Bajo', medium: 'Medio', high: 'Alto', critical: 'Crítico', info: 'Informativo',
  must: 'Obligatorio', should: 'Recomendado', could: 'Opcional', explicit: 'Explícito', inferred: 'Inferido',
  required: 'Necesario', recommended: 'Recomendado', optional: 'Opcional',
  unverified: 'Por verificar', confirmed: 'Confirmado', false_positive: 'Falso positivo', resolved: 'Resuelto',
};
export const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
export type PlanTask = { id: string; group: 'scope' | 'security' | 'aws' | 'validate'; title: string; detail: string };
export function buildActionPlan(data: AnalysisDetail): PlanTask[] {
  return [
    ...data.requirements.filter(r => r.origin === 'inferred').map(r => ({
      id: 'requirement-' + r.id, group: 'scope' as const, title: 'Confirmar: ' + r.title, detail: r.description,
    })),
    ...data.findings.filter(f => !['resolved','false_positive'].includes(f.verification_status))
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).map(f => ({
        id: 'finding-' + f.id, group: 'security' as const, title: f.title, detail: f.remediation,
      })),
    ...[...data.recommendations].sort((a, b) => a.deployment_order - b.deployment_order).map(r => ({
      id: 'service-' + r.id, group: 'aws' as const, title: 'Preparar ' + r.service_name,
      detail: r.suggested_configuration.description || r.purpose,
    })),
    { id: 'validate-cost', group: 'validate' as const, title: 'Cotizar y revisar el presupuesto', detail: 'Estima los servicios de esta propuesta para tu región y carga real antes de contratarlos.' },
    { id: 'validate-security', group: 'validate' as const, title: 'Comprobar los controles en el entorno real', detail: 'Verifica permisos, acceso a datos y cifrado. Marca los hallazgos como resueltos solo después de comprobar las correcciones.' },
    { id: 'validate-flow', group: 'validate' as const, title: 'Probar el flujo completo de la aplicación', detail: 'Comprueba acceso, operaciones principales y recuperación de datos antes de publicar.' },
  ];
}
export function analysisFailure(message: string | null) {
  const raw = message ?? 'La ejecución no se completó.';
  if (/evidencia|referencia.*inválida/i.test(raw)) return { title: 'No pudimos verificar las evidencias del informe', description: 'Gemini respondió, pero algunas referencias no se pudieron comprobar. El informe se rechazó para evitar guardar citas incorrectas. Reintenta con las fuentes que ya tienes guardadas.', retry: 'Reintentar análisis' };
  if (/503|502|504|500|temporalmente/i.test(raw)) return { title: 'Gemini está temporalmente indisponible', description: 'El proveedor no pudo responder. Tus fuentes y el último informe completado siguen guardados. Los nuevos intentos reintentan automáticamente los fallos transitorios.', retry: 'Reintentar análisis' };
  if (/cuota|429|Límite de/i.test(raw)) return { title: 'La cuota está temporalmente agotada', description: 'Espera unos minutos antes de volver a analizar. Tus fuentes y el historial siguen guardados.', retry: 'Volver a intentar' };
  if (/clave|API_KEY|permisos|modelo.*disponible/i.test(raw)) return { title: 'Gemini necesita una revisión de configuración', description: 'Revisa el modelo, la clave y sus permisos en Supabase. Después puedes reintentar con las mismas fuentes.', retry: 'Reintentar análisis' };
  if (/400|formato|configuración/i.test(raw)) return { title: 'Gemini rechazó la solicitud', description: 'El informe no llegó a generarse. Tus fuentes siguen guardadas; puedes crear un nuevo intento con la función actualizada.', retry: 'Reintentar análisis' };
  return { title: 'No se pudo completar el análisis', description: 'Tus fuentes siguen guardadas. Revisa el detalle y vuelve a intentarlo; si el contenido es insuficiente, agrega documentación.', retry: 'Reintentar análisis' };
}
export function reportMarkdown(name: string, run: AnalysisRun, data: AnalysisDetail, checked: Set<string>) {
  const lines = ['# Informe de ' + name, '', 'Fecha: ' + run.created_at, 'Modelo: ' + run.model, '',
    '## Resumen', run.summary ?? '', '', 'Seguridad estimada: ' + (run.security_score === null ? 'Sin evaluar' : run.security_score + '/100'),
    'Riesgo: ' + (analysisLabels[run.risk_level ?? 'unknown'] ?? 'Sin evaluar'), '',
    '## Requisitos',
    ...data.requirements.flatMap(r => ['### ' + r.title, r.description, 'Prioridad: ' + analysisLabels[r.priority] + ' · ' + analysisLabels[r.origin], '> ' + r.evidence_excerpt.replace(/\n/g,'\n> '), 'Ubicación: ' + r.evidence_location, '']),
    '## Hallazgos de seguridad',
    ...data.findings.flatMap(f => ['### ' + f.title + ' — ' + analysisLabels[f.severity], 'Origen: ' + (f.detector === 'static' ? 'Regla verificada' + (f.rule_id ? ' (' + f.rule_id + ')' : '') : 'Análisis contextual con IA'), f.description, 'Acción: ' + f.remediation, ...(f.aws_controls?.length ? ['Controles AWS: ' + f.aws_controls.map(c => c.service + ' — ' + c.control).join('; ')] : []), '> ' + f.evidence_excerpt.replace(/\n/g,'\n> '), 'Ubicación: ' + f.evidence_location, '']),
    '## Servicios AWS',
    ...data.recommendations.flatMap(r => ['### ' + r.service_name, r.purpose, 'Justificación: ' + r.rationale,
      'Configuración: ' + (r.suggested_configuration.description ?? 'Por definir'),
      'Requisitos: ' + r.cloudops_recommendation_requirements.map(link => data.requirements.find(q => q.id === link.requirement_id)?.title ?? link.requirement_id).join(', '),
      'Supuestos: ' + r.assumptions.join('; '), 'Alternativas: ' + r.alternatives.join('; '), serviceEstimate(r) ? `Costo orientativo: USD ${serviceEstimate(r)!.min}–${serviceEstimate(r)!.max}/mes en ${serviceEstimate(r)!.region}. ${serviceEstimate(r)!.basis}. Supuestos: ${serviceEstimate(r)!.assumptions.join('; ')}` : 'Costo: pendiente de estimar.', '']),
    '## Plan de trabajo (seguimiento personal)',
    ...buildActionPlan(data).map(t => '- [' + (checked.has(t.id) ? 'x' : ' ') + '] ' + t.title + ': ' + t.detail),
    '', 'Marcar tareas no modifica ni verifica la evaluación de seguridad.', '', '## Alcance y limitaciones', ...run.limitations.map(v => '- ' + v),
    '', '## Fuentes analizadas', ...(data.sources ?? []).map(s => {
      const v = s.cloudops_source_versions;
      return '- ' + v.cloudops_project_sources.label + ' · versión ' + v.version + (v.resolved_revision ? ' · revisión ' + v.resolved_revision : '');
    }),
  ];
  return lines.join('\n');
}
