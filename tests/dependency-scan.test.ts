// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { scanNpmDependencies } from '../supabase/functions/cloudops-analyze-project/dependencyScan';
const source = (text: string) => [{ id: '11111111-1111-4111-8111-111111111111', extracted_text: text, coverage: {}, resolved_revision: null }];
const lockfile = '--- FILE: package-lock.json ---\n' + JSON.stringify({ lockfileVersion: 3, packages: { '': { name: 'app' }, 'node_modules/example-package': { version: '1.0.0' } } });
describe('verificación de dependencias npm', () => {
  it('consulta OSV con versiones exactas y devuelve un hallazgo verificable', async () => {
    const vulnerability = {
      id: 'GHSA-test-1234', summary: 'Fallo conocido',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' }],
      affected: [{ package: { name: 'example-package', ecosystem_specific: { severity: 'HIGH' } } }],
    };
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ vulns: [{ id: 'GHSA-test-1234' }] }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify(vulnerability)));
    const report = await scanNpmDependencies(source(lockfile), fetcher);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).queries[0]).toMatchObject({ package: { name: 'example-package', ecosystem: 'npm' }, version: '1.0.0' });
    expect(report.findings[0]).toMatchObject({ rule_id: 'OSV-GHSA-test-1234', severity: 'high', detector: 'static' });
    expect(report.coverage.join(' ')).toMatch(/OSV/);
  });
  it('no presenta un fallo de OSV como ausencia de vulnerabilidades', async () => {
    const report = await scanNpmDependencies(source(lockfile), vi.fn().mockResolvedValue(new Response('error', { status: 503 })));
    expect(report.findings).toEqual([]); expect(report.coverage.join(' ')).toMatch(/no estuvo disponible/i);
  });
  it('consulta dependencias Python únicamente cuando requirements fija una versión exacta', async () => {
    const python = '--- FILE: requirements.txt ---\nDjango==4.2.0\nrequests>=2.0\n-r base.txt';
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ vulns: [] }] })));
    const report = await scanNpmDependencies(source(python), fetcher);
    const query = JSON.parse(fetcher.mock.calls[0][1].body).queries;
    expect(query).toEqual([{ package: { name: 'Django', ecosystem: 'PyPI' }, version: '4.2.0' }]);
    expect(report.findings).toEqual([]); expect(report.coverage.join(' ')).toMatch(/Python/);
  });
  it('extrae versiones resueltas de Poetry, Pipenv y uv', async () => {
    const locks = `--- FILE: poetry.lock ---\n[[package]]\nname = "flask"\nversion = "2.0.0"\n--- FILE: Pipfile.lock ---\n{"default":{"requests":{"version":"==2.28.0"}}}\n--- FILE: uv.lock ---\n[[package]]\nname = "fastapi"\nversion = "0.100.0"`;
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ vulns: [] }, { vulns: [] }, { vulns: [] }] })));
    await scanNpmDependencies(source(locks), fetcher);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).queries.map((q: any) => q.package.name)).toEqual(['flask', 'requests', 'fastapi']);
  });
});
