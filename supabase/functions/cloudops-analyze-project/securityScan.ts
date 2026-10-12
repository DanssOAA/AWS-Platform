import { sanitizeText, type SourceVersion } from './core.ts';

export type StaticSecurityFinding = {
  source_version_id: string; rule_id: string; title: string; severity: 'low' | 'medium' | 'high'; category: string;
  description: string; remediation: string; evidence_excerpt: string; evidence_location: string; confidence: number;
  detector: 'static'; scanner_version: string;
  aws_controls: { service: string; control: string }[];
};

type Rule = Omit<StaticSecurityFinding, 'source_version_id' | 'evidence_excerpt' | 'evidence_location' | 'detector' | 'scanner_version'> & { pattern: RegExp };
const rules: Rule[] = [
  { rule_id: 'WEB-LOCALSTORAGE-TOKEN', pattern: /localStorage\.(?:setItem|getItem)\s*\(\s*['"][^'"]*(?:token|jwt|session|auth)[^'"]*['"]/i, title: 'Token de sesión almacenado en localStorage', severity: 'medium', category: 'web-security', description: 'Un script inyectado mediante XSS podría leer el token almacenado en el navegador.', remediation: 'Usa cookies Secure, HttpOnly y SameSite; aplica una CSP estricta y evita almacenar tokens de sesión en localStorage.', confidence: 0.95, aws_controls: [{ service: 'Amazon CloudFront', control: 'Response Headers Policy con Content-Security-Policy' }, { service: 'Amazon Cognito', control: 'Cookies seguras o flujo de tokens de corta duración' }] },
  { rule_id: 'WEB-DANGEROUS-HTML', pattern: /dangerouslySetInnerHTML\s*=/, title: 'Renderizado directo de HTML', severity: 'medium', category: 'web-security', description: 'Renderizar HTML sin sanitización puede introducir XSS.', remediation: 'Evita HTML no confiable. Si es imprescindible, sanitízalo con una biblioteca mantenida y aplica CSP.', confidence: 0.9, aws_controls: [{ service: 'Amazon CloudFront', control: 'Response Headers Policy con Content-Security-Policy' }, { service: 'AWS WAF', control: 'Reglas administradas como capa adicional, no sustituto de sanitización' }] },
  { rule_id: 'IAC-OPEN-ADMIN-PORT', pattern: /(?:from_port\s*=\s*(?:22|3389)[\s\S]{0,500}?cidr_blocks\s*=\s*\[[^\]]*0\.0\.0\.0\/0|(?:22|3389)[\s\S]{0,500}?0\.0\.0\.0\/0)/i, title: 'Puerto administrativo expuesto a Internet', severity: 'high', category: 'infrastructure', description: 'SSH o RDP abierto a cualquier dirección incrementa la superficie de ataque.', remediation: 'Elimina 0.0.0.0/0 para administración. Usa SSM Session Manager o restringe por VPN, bastión y CIDR corporativo.', confidence: 0.98, aws_controls: [{ service: 'AWS Systems Manager', control: 'Session Manager sin puertos entrantes' }, { service: 'Amazon VPC', control: 'Security Groups con acceso mínimo por CIDR' }] },
  { rule_id: 'IAC-S3-PUBLIC-READ', pattern: /(?:acl\s*=\s*['"]public-read['"]|block_public_(?:acls|policy)\s*=\s*false)/i, title: 'Configuración pública de bucket S3', severity: 'high', category: 'infrastructure', description: 'El bucket puede exponer objetos públicamente si no existen otras restricciones.', remediation: 'Activa S3 Block Public Access. Para contenido web, usa CloudFront con Origin Access Control en vez de lectura pública directa.', confidence: 0.95, aws_controls: [{ service: 'Amazon S3', control: 'Block Public Access' }, { service: 'Amazon CloudFront', control: 'Origin Access Control (OAC)' }] },
];

function lineAt(text: string, index: number) { return text.slice(0, index).split('\n').length; }
export function scanSecurity(versions: SourceVersion[]): StaticSecurityFinding[] {
  const results: StaticSecurityFinding[] = [];
  for (const source of versions) for (const rule of rules) {
    const match = rule.pattern.exec(source.extracted_text);
    if (!match) continue;
    const line = lineAt(source.extracted_text, match.index);
    const excerpt = sanitizeText(source.extracted_text.split('\n')[line - 1].trim()).slice(0, 1000);
    results.push({ ...rule, detector: 'static', scanner_version: 'cloudops-static-v1', source_version_id: source.id, evidence_excerpt: excerpt || 'Patrón detectado en la fuente importada.', evidence_location: `Texto importado · línea ${line} · regla ${rule.rule_id}` });
  }
  return results;
}
