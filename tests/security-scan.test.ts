// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { scanSecurity, scanSecurityReport } from '../supabase/functions/cloudops-analyze-project/securityScan';
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
  it('declara explícitamente la cobertura y los límites del escáner', () => {
    const report = scanSecurityReport(source('const app = true;'));
    expect(report.findings).toEqual([]); expect(report.coverage.join(' ')).toMatch(/no ejecutó código.*CVE.*AWS desplegados/i);
  });
});
