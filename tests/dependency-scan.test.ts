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
});
