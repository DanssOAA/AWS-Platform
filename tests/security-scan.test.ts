// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { scanSecurity, scanSecurityReport, verifiedSecurityPosture } from '../supabase/functions/cloudops-analyze-project/securityScan';
const source = (text: string) => [{ id: '11111111-1111-4111-8111-111111111111', extracted_text: text, coverage: {}, resolved_revision: null }];
describe('escáner estático de seguridad', () => {
  it('identifica patrones web e infraestructura y conserva evidencia localizada', () => {
    const findings = scanSecurity(source("localStorage.setItem('accessToken', token)\nresource \"aws_security_group\" \"x\" { from_port = 22 cidr_blocks = [\"0.0.0.0/0\"] }\nacl = \"public-read\""));
    expect(findings.map(f => f.rule_id)).toEqual(['WEB-LOCALSTORAGE-TOKEN', 'IAC-OPEN-ADMIN-PORT', 'IAC-S3-PUBLIC-READ']);
    expect(findings[1].severity).toBe('high'); expect(findings[2].aws_controls[1].control).toContain('OAC');
    expect(findings[0].evidence_location).toContain('línea 1');
  });
  it('no ejecuta contenido ni convierte texto normal en hallazgo', () => {
    expect(scanSecurity(source('describe la política de tokens y los puertos 22/3389, sin configuración.'))).toEqual([]);
  });
  it('señala package.json sin lockfile importado y omite el aviso cuando existe uno', () => {
    const withoutLock = scanSecurity(source('--- FILE: apps/web/package.json ---\n{"dependencies":{"react":"^19.0.0"}}'));
    expect(withoutLock.map(f => f.rule_id)).toContain('DEP-NO-LOCKFILE');
    const withLock = scanSecurity(source('--- FILE: apps/web/package.json ---\n{}\n--- FILE: apps/web/package-lock.json ---\n{}'));
    expect(withLock.map(f => f.rule_id)).not.toContain('DEP-NO-LOCKFILE');
    const acrossSources = scanSecurity([...source('--- FILE: package.json ---\n{}'), ...source('--- FILE: package-lock.json ---\n{}')]);
    expect(acrossSources.map(f => f.rule_id)).not.toContain('DEP-NO-LOCKFILE');
  });
  it('declara explícitamente la cobertura y los límites del escáner', () => {
    const report = scanSecurityReport(source('const app = true;'));
    expect(report.findings).toEqual([]); expect(report.coverage.join(' ')).toMatch(/no ejecutó código.*CVE.*AWS desplegados/i);
  });
  it('calcula una puntuación reproducible solo para los controles verificados', () => {
    expect(verifiedSecurityPosture([])).toMatchObject({ security_score: 100, risk_level: 'low' });
    expect(verifiedSecurityPosture(scanSecurity(source('acl = "public-read"')))).toMatchObject({ security_score: 70, risk_level: 'high' });
  });
});
