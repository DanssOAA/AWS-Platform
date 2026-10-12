import { sanitizeText, type SourceVersion } from './core.ts';
import type { StaticSecurityFinding } from './securityScan.ts';

type LockedPackage = { source_version_id: string; name: string; version: string; ecosystem: 'npm' | 'PyPI'; source_file: string };
type OsvVulnerability = { id?: unknown; summary?: unknown; withdrawn?: unknown; severity?: { type?: unknown; score?: unknown }[]; affected?: { package?: { name?: unknown; ecosystem_specific?: { severity?: unknown } } }[] };
const MAX_PACKAGES = 50;
const MAX_FINDINGS = 12;
const HEADER = /--- FILE: ([^\n]*package-lock\.json) ---\n([\s\S]*?)(?=\n--- FILE: |\s*$)/gi;
const REQUIREMENTS = /--- FILE: ([^\n]*(?:requirements(?:[-._][^/\n]+)?|constraints)\.txt) ---\n([\s\S]*?)(?=\n--- FILE: |\s*$)/gi;
const PYTHON_LOCK = /--- FILE: ([^\n]*(?:poetry\.lock|uv\.lock|Pipfile\.lock)) ---\n([\s\S]*?)(?=\n--- FILE: |\s*$)/gi;

function lockedPackages(versions: SourceVersion[]) {
  const found: LockedPackage[] = [];
  for (const source of versions) {
    HEADER.lastIndex = 0;
    for (let match; (match = HEADER.exec(source.extracted_text));) {
      try {
        const data = JSON.parse(match[2]);
        if (!data || typeof data !== 'object' || !data.packages || typeof data.packages !== 'object') continue;
        for (const [path, value] of Object.entries(data.packages as Record<string, unknown>)) {
          if (!path.startsWith('node_modules/') || !value || typeof value !== 'object') continue;
          const name = path.slice('node_modules/'.length);
          const version = (value as { version?: unknown }).version;
          if (!name || typeof version !== 'string' || !/^[0-9A-Za-z][0-9A-Za-z.+_-]{0,127}$/.test(version)) continue;
          found.push({ source_version_id: source.id, name, version, ecosystem: 'npm', source_file: match[1] });
        }
      } catch { /* A malformed lockfile is not a vulnerability finding. */ }
    }
  }
  for (const source of versions) {
    PYTHON_LOCK.lastIndex = 0;
    for (let match; (match = PYTHON_LOCK.exec(source.extracted_text));) {
      if (/Pipfile\.lock$/i.test(match[1])) try {
        const data = JSON.parse(match[2]);
        for (const section of ['default', 'develop']) for (const [name, value] of Object.entries(data?.[section] ?? {})) {
          const version = (value as { version?: unknown })?.version;
          if (typeof version === 'string' && /^==[0-9A-Za-z][0-9A-Za-z.+!_-]{0,127}$/.test(version)) found.push({ source_version_id: source.id, name, version: version.slice(2), ecosystem: 'PyPI', source_file: match[1] });
        }
      } catch { /* ignored */ }
      else for (const block of match[2].split(/\n\[\[package\]\]\n/)) {
        const name = block.match(/^name\s*=\s*["']([^"']+)["']/m)?.[1]; const version = block.match(/^version\s*=\s*["']([^"']+)["']/m)?.[1];
        if (name && version && /^[0-9A-Za-z][0-9A-Za-z.+!_-]{0,127}$/.test(version)) found.push({ source_version_id: source.id, name, version, ecosystem: 'PyPI', source_file: match[1] });
      }
    }
  }
  for (const source of versions) {
    REQUIREMENTS.lastIndex = 0;
    for (let match; (match = REQUIREMENTS.exec(source.extracted_text));) for (const rawLine of match[2].split('\n')) {
      const line = rawLine.replace(/\s+#.*$/, '').trim();
      const pinned = line.match(/^([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?==([0-9A-Za-z][0-9A-Za-z.+!_-]{0,127})$/);
      if (pinned) found.push({ source_version_id: source.id, name: pinned[1], version: pinned[2], ecosystem: 'PyPI', source_file: match[1] });
    }
  }
  return [...new Map(found.map(item => [`${item.ecosystem}:${item.name}@${item.version}`, item])).values()].slice(0, MAX_PACKAGES);
}
function severity(vulnerability: OsvVulnerability, packageName: string): 'low' | 'medium' | 'high' {
  const score = vulnerability.severity?.map(item => typeof item.score === 'string' && /^\d+(?:\.\d+)?$/.test(item.score) ? Number(item.score) : NaN).find(value => Number.isFinite(value));
  if (typeof score === 'number') return score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';
  const reported = vulnerability.affected?.find(item => item.package?.name === packageName)?.package?.ecosystem_specific?.severity;
  return reported === 'CRITICAL' || reported === 'HIGH' ? 'high' : reported === 'MODERATE' || reported === 'MEDIUM' ? 'medium' : 'low';
}
async function json(response: Response) {
  if (!response.ok) throw new Error(`OSV HTTP ${response.status}`);
  return response.json();
}

export async function scanNpmDependencies(versions: SourceVersion[], fetcher: typeof fetch = fetch): Promise<{ findings: StaticSecurityFinding[]; coverage: string[] }> {
  const packages = lockedPackages(versions);
  if (!packages.length) return { findings: [], coverage: ['Dependencias: no se encontró un package-lock.json compatible; no se consultaron vulnerabilidades conocidas.'] };
  try {
    const response = await fetcher('https://api.osv.dev/v1/querybatch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(12000),
      body: JSON.stringify({ queries: packages.map(item => ({ package: { name: item.name, ecosystem: item.ecosystem }, version: item.version })) }),
    });
    const batch = await json(response) as { results?: { vulns?: { id?: unknown }[]; next_page_token?: unknown }[] };
    if (!Array.isArray(batch.results) || batch.results.length !== packages.length) throw new Error('Respuesta OSV inválida');
    const matches = batch.results.flatMap((result, index) => (result?.vulns ?? []).map(vulnerability => ({ item: packages[index], id: vulnerability?.id })))
      .filter((match): match is { item: LockedPackage; id: string } => typeof match.id === 'string' && /^[A-Za-z0-9._-]{3,160}$/.test(match.id))
      .slice(0, MAX_FINDINGS);
    const details = await Promise.all(matches.map(async match => {
      const response = await fetcher('https://api.osv.dev/v1/vulns/' + encodeURIComponent(match.id), { signal: AbortSignal.timeout(8000) });
      return { ...match, vulnerability: await json(response) as OsvVulnerability };
    }));
    const findings = details.filter(({ vulnerability }) => !vulnerability.withdrawn).map(({ item, id, vulnerability }) => {
      const summary = typeof vulnerability.summary === 'string' ? sanitizeText(vulnerability.summary).slice(0, 600) : 'Vulnerabilidad conocida reportada por OSV.';
      return {
        source_version_id: item.source_version_id, rule_id: `OSV-${id}`, title: `${item.name}@${item.version}: ${id}`, severity: severity(vulnerability, item.name), category: 'dependency-vulnerability',
        description: summary, remediation: `Actualiza ${item.name} a una versión corregida y vuelve a generar el lockfile. Valida compatibilidad y despliega el cambio mediante tu proceso de CI/CD.`,
        evidence_excerpt: `${item.name}@${item.version} coincide con ${id} en la base OSV.`, evidence_location: `${item.source_file} · ${item.name}@${item.version} · OSV ${id}`,
        confidence: 0.98, detector: 'static' as const, scanner_version: 'cloudops-osv-npm-v1',
        aws_controls: [{ service: 'AWS CodeBuild', control: 'Pipeline de CI con escaneo de dependencias antes del despliegue' }, { service: 'Amazon Inspector', control: 'Evaluación complementaria de imágenes de contenedor en ECR' }],
      };
    });
    const pages = batch.results.some(result => typeof result?.next_page_token === 'string');
    return { findings, coverage: [`Dependencias npm/Python: se consultaron ${packages.length} versión(es) exacta(s) fijadas en package-lock.json o requirements/constraints.txt en OSV; se reportan hasta ${MAX_FINDINGS} coincidencias.${pages ? ' La respuesta fue paginada; podrían existir más coincidencias.' : ''}`] };
  } catch (error) {
    console.error('cloudops dependency scan unavailable', error instanceof Error ? error.message : 'unknown');
    return { findings: [], coverage: [`Dependencias npm/Python: OSV no estuvo disponible; no se verificaron ${packages.length} versión(es) exacta(s).`] };
  }
}
