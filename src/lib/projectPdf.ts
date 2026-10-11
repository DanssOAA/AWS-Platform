import { serviceEstimate } from './projectEstimates';
import { jsPDF } from 'jspdf';
import { autoTable, type RowInput } from 'jspdf-autotable';
import type { AnalysisDetail, AnalysisRun, Recommendation } from './projectAnalysis';
import { analysisLabels as labels, buildActionPlan, severityOrder } from './analysisPresentation';

export type TechnicalReportInput = { projectName: string; run: AnalysisRun; data: AnalysisDetail; checked: Set<string> };
export type PdfFonts = { regular: string; bold: string };
const color = { navy: '#122442', blue: '#245CD6', ink: '#24344B', muted: '#5C6B7D' };
const clean = (value: unknown) => String(value ?? '').normalize('NFC').replace(/[\u2010-\u2015\u2212]/g, '-').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
const date = (value: string | Date) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(value));
const money = (value: number) => `USD ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function hasVerifiedQuote(r: Recommendation) {
  return r.estimated_monthly_min_usd !== null && r.estimated_monthly_max_usd !== null
    && Number.isFinite(Number(r.estimated_monthly_min_usd)) && Number(r.estimated_monthly_min_usd) >= 0
    && Number.isFinite(Number(r.estimated_monthly_max_usd)) && Number(r.estimated_monthly_max_usd) >= Number(r.estimated_monthly_min_usd)
    && Boolean(r.region && r.pricing_reference_url?.startsWith('https://') && r.pricing_checked_at && Number.isFinite(Date.parse(r.pricing_checked_at)));
}
export function reportCosts(services: Recommendation[]) {
  const estimates = services.map(serviceEstimate).filter(e => e !== null);
  return { quoted: estimates.length, complete: services.length > 0 && estimates.length === services.length,
    min: estimates.length ? estimates.reduce((sum,e) => sum + e.min,0) : null,
    max: estimates.length ? estimates.reduce((sum,e) => sum + e.max,0) : null };
}
export function technicalPdfFilename(name: string, run: AnalysisRun) {
  const slug = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 65) || 'proyecto';
  return `informe-tecnico-aws-${slug}-${run.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}.pdf`;
}

/** Text-based, selectable PDF. Every project value comes from the saved analysis. */
export function createTechnicalPdf(input: TechnicalReportInput, fonts: PdfFonts, exportedAt = new Date()) {
  const { projectName, run, data, checked } = input;
  if (run.status !== 'completed') throw new Error('Completa el análisis antes de exportar el informe.');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS('Vera.ttf', fonts.regular); doc.addFont('Vera.ttf', 'Vera', 'normal');
  doc.addFileToVFS('VeraBd.ttf', fonts.bold); doc.addFont('VeraBd.ttf', 'Vera', 'bold');
  doc.setProperties({ title: clean('Informe técnico AWS - ' + projectName), subject: 'Requisitos, servicios, costos y seguridad del proyecto', author: 'CloudOps', creator: 'CloudOps' });
  doc.setFont('Vera', 'normal');
  const margin = 18, width = 174, bottom = 276;
  let y = 28;
  function page() { doc.addPage(); y = 28; }
  function ensure(height: number) { if (y + height > bottom) page(); }
  function paragraph(value: unknown, size = 9, muted = false) {
    doc.setFont('Vera', 'normal'); doc.setFontSize(size); doc.setTextColor(muted ? color.muted : color.ink);
    const lines = doc.splitTextToSize(clean(value), width) as string[];
    const lineHeight = size * 0.48;
    for (const line of lines) { ensure(lineHeight); doc.text(line, margin, y); y += lineHeight; }
    y += 3;
  }
  function heading(value: string, major = false) {
    ensure(22); doc.setFont('Vera', 'bold'); doc.setFontSize(major ? 17 : 12); doc.setTextColor(major ? color.navy : color.blue);
    const lines = doc.splitTextToSize(clean(value), width) as string[];
    for (const line of lines) { ensure(9); doc.text(line, margin, y); y += major ? 8 : 6; }
    y += 3;
  }
  function section(value: string) { page(); heading(value, true); }
  function table(head: string[], rows: RowInput[], columnWidths?: number[]) {
    if (!rows.length) { paragraph('No registrado en este análisis.', 9, true); return; }
    ensure(24);
    autoTable(doc, { head: [head], body: rows, startY: y, margin: { top: 28, right: margin, bottom: 22, left: margin }, tableWidth: width,
      theme: 'striped', rowPageBreak: 'avoid', showHead: 'everyPage',
      styles: { font: 'Vera', fontSize: 8, cellPadding: 3, textColor: [36, 52, 75], overflow: 'linebreak', valign: 'top', lineColor: [225, 232, 240], lineWidth: 0.1 },
      headStyles: { fillColor: [18, 36, 66], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [244, 247, 251] },
      columnStyles: Object.fromEntries((columnWidths ?? []).map((w, index) => [index, { cellWidth: w }])),
      didParseCell: hook => { hook.cell.text = hook.cell.text.map(clean); },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }
  function field(label: string, value: unknown) { heading(label); paragraph(value); }
  const context = run.input_context ?? {};
  const services = [...data.recommendations].sort((a, b) => a.deployment_order - b.deployment_order);
  const costs = reportCosts(services);
  const evidence = new Map<string, { id: string; source?: string; excerpt: string; location: string }>();
  function evidenceId(item: { source_version_id?: string; evidence_excerpt: string; evidence_location: string }) {
    const key = JSON.stringify([item.source_version_id, item.evidence_excerpt, item.evidence_location]);
    if (!evidence.has(key)) evidence.set(key, { id: `E${evidence.size + 1}`, source: item.source_version_id, excerpt: item.evidence_excerpt, location: item.evidence_location });
    return evidence.get(key)!.id;
  }
  doc.setFont('Vera', 'bold'); doc.setFontSize(16);
  const nameLines = doc.splitTextToSize(clean(projectName), width) as string[];
  const heroHeight = Math.max(86, 66 + nameLines.length * 8);
  doc.setFillColor(color.navy); doc.rect(0, 0, 210, heroHeight, 'F');
  doc.setTextColor('#94BCFF'); doc.setFontSize(10); doc.text('CLOUDOPS / PROYECTO ANALIZADO', margin, 20);
  doc.setTextColor('#FFFFFF'); doc.setFontSize(23); doc.text('Informe técnico AWS', margin, 40);
  doc.setFontSize(16); doc.text(nameLines, margin, 57, { lineHeightFactor: 1.4 });
  y = heroHeight + 13;
  table(['Identificación', 'Detalle'], [
    ['Análisis', run.id], ['Fecha del análisis', date(run.created_at) + ' (Lima)'],
    ['Documento generado', date(exportedAt) + ' (Lima)'], ['Modelo', run.model],
    ['Contenido', `${data.requirements.length} requisitos / ${data.findings.length} hallazgos / ${services.length} servicios AWS`],
    ['Seguridad estimada', `${run.security_score === null ? 'Sin evaluar' : run.security_score + '/100'} / Riesgo: ${labels[run.risk_level ?? 'unknown'] ?? 'Sin evaluar'}`],
  ], [48, 126]);
  heading('Resumen ejecutivo'); paragraph(run.summary ?? 'Sin resumen registrado.');
  paragraph('Documento de planificación basado en fuentes importadas y análisis con IA. Describe recomendaciones; no acredita infraestructura desplegada ni certifica seguridad.', 8, true);

  section('01 / Alcance y necesidades del proyecto');
  if (context.description) field('Descripción aportada', context.description);
  table(['Restricción', 'Valor aportado al análisis'], [
    ['Región preferida', context.preferred_region ?? 'Por definir'],
    ['Presupuesto mensual', context.monthly_budget_usd == null ? 'Por definir' : money(Number(context.monthly_budget_usd))],
    ['Usuarios previstos', context.expected_users ?? 'Por definir'],
    ['Disponibilidad objetivo', context.availability_target == null ? 'Por definir' : `${context.availability_target}%`],
  ], [58, 116]);
  for (const [i, r] of data.requirements.entries()) {
    heading(`R${i + 1} / ${r.title}`);
    paragraph(`${labels[r.priority] ?? r.priority} | ${r.origin === 'inferred' ? 'Inferido: confirmar con el responsable' : 'Explícito en la fuente'} | Confianza IA: ${Math.round(r.confidence * 100)}% | Evidencia: ${evidenceId(r)}`, 8, true);
    paragraph(r.description);
  }

  section('02 / Servicios AWS: usos y configuración');
  paragraph('La numeración expresa el orden sugerido de preparación. Las configuraciones y supuestos deben validarse antes de contratar o desplegar recursos.', 9, true);
  table(['Orden', 'Servicio recomendado', 'Prioridad'], services.map((r, i) => [String(i + 1), r.service_name, labels[r.priority] ?? r.priority]), [18, 115, 41]);
  for (const [i, r] of services.entries()) {
    ensure(60);
    heading(`${i + 1}. ${r.service_name}`);
    field('Uso en la aplicación', r.purpose);
    field('Necesidad que resuelve', r.rationale);
    field('Configuración de partida', r.suggested_configuration.description ?? 'Pendiente de definir.');
    const requirements = r.cloudops_recommendation_requirements.map(link => {
      const index = data.requirements.findIndex(q => q.id === link.requirement_id);
      return index < 0 ? 'Requisito asociado no disponible' : `R${index + 1}: ${data.requirements[index].title}`;
    });
    field('Requisitos atendidos', requirements.join('\n') || 'Sin asociación registrada.');
    if (r.assumptions.length) field('Supuestos por confirmar', r.assumptions.map(a => '- ' + a).join('\n'));
    if (r.alternatives.length) field('Alternativas consideradas', r.alternatives.map(a => '- ' + a).join('\n'));
    y += 4;
  }

  section('03 / Costos y presupuesto');
  paragraph('El total suma todos los servicios listados, incluidos los opcionales. Revisa qué alternativas no se contratarían juntas y ajusta el escenario antes de decidir.', 8, true);
  paragraph(`Servicios con estimación: ${costs.quoted} de ${services.length}. Los rangos generados por IA son orientativos; no son precios verificados ni facturación real.`);
  table(['Servicio', 'Estimación mensual', 'Región / origen'], services.map(r => {
    const e = serviceEstimate(r);
    return [r.service_name, e ? `${money(e.min)} - ${money(e.max)}` : 'Pendiente de estimar', e ? `${e.region} / ${e.kind === 'ai_estimate' ? 'IA orientativa' : 'Registrada'}` : 'Por definir'];
  }), [64, 65, 45]);
  for (const r of services) { const e = serviceEstimate(r); if (e) { heading(r.service_name + ' / Base del costo'); paragraph(e.basis); for (const a of e.assumptions) paragraph('- ' + a, 8, true); } }
  if (costs.min !== null && costs.max !== null) {
    field(costs.complete ? 'Estimación mensual total' : 'Subtotal mensual de los servicios estimados', `${money(costs.min)} - ${money(costs.max)}`);
    if (costs.complete) field('Proyección anual (12 meses con el mismo uso)', `${money(costs.min * 12)} - ${money(costs.max * 12)}`);
  }
  if (!costs.complete) paragraph('El costo total mensual y anual está pendiente. Los servicios sin cotización no se consideran gratuitos ni se suman como cero.');
  if (context.monthly_budget_usd != null) {
    field('Presupuesto mensual declarado', money(Number(context.monthly_budget_usd)));
    if (costs.complete && costs.max !== null) paragraph(costs.max > Number(context.monthly_budget_usd) ? 'El extremo superior de la estimación supera el presupuesto declarado. Revisar alcance, consumo y alternativas.' : 'El intervalo registrado no supera el presupuesto declarado. Confirmar consumo y cargos adicionales antes de contratar.');
  }
  for (const r of services.filter(hasVerifiedQuote)) paragraph(`Referencia de ${r.service_name}: ${r.pricing_reference_url}`, 8, true);
  heading('Información necesaria para cerrar la cotización');
  paragraph('Confirmar región, tamaño y cantidad de recursos, horas de uso, solicitudes, almacenamiento, copias de seguridad y transferencia de datos. Revisar impuestos, soporte y otros cargos no detallados en las referencias.');
  paragraph('Herramienta de cotización: https://calculator.aws/', 8, true);
  paragraph('Los importes son estimaciones registradas, no facturación real de AWS. Este PDF no consulta precios en tiempo real.', 8, true);

  section('04 / Seguridad y medidas necesarias');
  if (!data.findings.length) paragraph('No se reportaron hallazgos en el contenido analizado. Esto no demuestra que el proyecto sea seguro.');
  for (const f of [...data.findings].sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9))) {
    heading(f.title); paragraph(`Severidad: ${labels[f.severity] ?? f.severity} | Estado: ${labels[f.verification_status] ?? f.verification_status} | Evidencia: ${evidenceId(f)}`, 8, true);
    paragraph(f.description); field('Acción recomendada', f.remediation);
  }

  section('05 / Plan de implementación y validación');
  paragraph('Seguimiento personal del análisis. Marcar una tarea no confirma un despliegue ni resuelve automáticamente los hallazgos.', 9, true);
  table(['Estado personal', 'Actividad', 'Acción concreta'], buildActionPlan(data).map(t => [checked.has(t.id) ? 'Marcada' : 'Pendiente', t.title, t.detail]), [27, 56, 91]);

  section('06 / Fuentes, evidencias y limitaciones');
  for (const source of data.sources ?? []) {
    const v = source.cloudops_source_versions;
    heading(v.cloudops_project_sources.label);
    paragraph(`Origen: ${v.cloudops_project_sources.kind} | Versión: ${v.version} | Importado: ${date(v.imported_at)}`, 8, true);
    if (v.cloudops_project_sources.url) paragraph(v.cloudops_project_sources.url, 8, true);
    if (v.resolved_revision) paragraph('Revisión: ' + v.resolved_revision, 8, true);
    if (Array.isArray(v.coverage.files)) paragraph('Archivos revisados: ' + v.coverage.files.join(', '), 8, true);
    if (v.coverage.truncated) paragraph('Cobertura parcial de la fuente.', 8, true);
  }
  if (!data.sources?.length) paragraph('No se recuperaron los metadatos de las fuentes de este análisis.', 9, true);
  heading('Evidencias citadas');
  for (const item of evidence.values()) {
    const source = data.sources?.find(s => s.source_version_id === item.source)?.cloudops_source_versions.cloudops_project_sources.label;
    heading(`${item.id} / ${source ?? 'Fuente del análisis'}`);
    paragraph(item.location, 8, true); paragraph(item.excerpt, 8);
  }
  heading('Límites de la evaluación');
  for (const limitation of run.limitations.filter(l => !l.startsWith('Cobertura de fuente '))) paragraph('- ' + limitation, 8, true);

  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n); doc.setFont('Vera', 'normal'); doc.setFontSize(7); doc.setTextColor(color.muted);
    if (n > 1) { doc.text('CLOUDOPS / INFORME TÉCNICO AWS', margin, 15); doc.setDrawColor('#E1E8F0'); doc.line(margin, 19, 192, 19); }
    doc.setDrawColor('#E1E8F0'); doc.line(margin, 282, 192, 282);
    doc.text(`Análisis ${run.id.slice(0, 8)} / Recomendaciones sujetas a validación`, margin, 288);
    doc.text(`${n} / ${pages}`, 192, 288, { align: 'right' });
  }
  return doc;
}

let fontsPromise: Promise<PdfFonts> | undefined;
async function loadFonts() {
  async function read(name: string) {
    const response = await fetch(`${import.meta.env.BASE_URL}fonts/${name}`);
    if (!response.ok) throw new Error('No se pudo cargar la tipografía del PDF. Reintenta la descarga.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 100 || bytes[0] !== 0 || bytes[1] !== 1 || bytes[2] !== 0 || bytes[3] !== 0) throw new Error('La tipografía del PDF no es válida. Recarga la aplicación.');
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    return btoa(binary);
  }
  fontsPromise ??= Promise.all([read('Vera.ttf'), read('VeraBd.ttf')]).then(([regular, bold]) => ({ regular, bold })).catch(error => { fontsPromise = undefined; throw error; });
  return fontsPromise;
}
export async function downloadTechnicalPdf(input: TechnicalReportInput, shouldDownload = () => true) {
  const fonts = await loadFonts();
  if (!shouldDownload()) return;
  const doc = createTechnicalPdf(input, fonts);
  await doc.save(technicalPdfFilename(input.projectName, input.run), { returnPromise: true });
}
