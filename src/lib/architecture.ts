import type { CloudProposal, CostEstimate, IAMUser, SecurityCheck } from '../types/cloud';

export type SecuritySettings = { encryption: boolean; privateDatabase: boolean; compliance: boolean; rotatedKeys: string[] };
export const DEFAULT_SECURITY: SecuritySettings = { encryption: true, privateDatabase: true, compliance: false, rotatedKeys: [] };
export function getSecurityChecks(users: IAMUser[], settings: SecuritySettings, services: string[]): SecurityCheck[] {
  const mfa = users.every(user => user.mfaEnabled);
  const keys = users.filter(user => user.accessKeyActive).every(user => settings.rotatedKeys.includes(user.id));
  return [
    { id: 'iam', title: 'IAM y menor privilegio', status: services.includes('iam') ? 'green' : 'yellow', category: 'IAM', responsibleParty: 'Cliente', description: 'Incluye IAM y define permisos limitados para cada rol.', recommendation: 'Revisa las políticas y evita permisos administrativos generales.' },
    { id: 'mfa', title: 'Autenticación MFA', status: mfa ? 'green' : 'red', category: 'Protección Cuentas', responsibleParty: 'Cliente', description: `${users.filter(user => user.mfaEnabled).length} de ${users.length} identidades tienen MFA.`, recommendation: 'Activa MFA en todas las identidades.' },
    { id: 'keys', title: 'Access Keys', status: keys ? 'green' : 'yellow', category: 'Protección Cuentas', responsibleParty: 'Cliente', description: 'Las claves activas necesitan revisión y rotación periódica.', recommendation: 'Usa credenciales temporales y rota las claves pendientes.' },
    { id: 'encryption', title: 'Cifrado de datos', status: settings.encryption ? 'green' : 'red', category: 'Protección Datos', responsibleParty: 'Cliente', description: 'Cifrado en reposo y TLS en tránsito.', recommendation: 'Habilita cifrado y define la administración de claves.' },
    { id: 'database', title: 'Protección de datos y red', status: settings.privateDatabase && services.includes('vpc') ? 'green' : 'red', category: 'Protección Datos', responsibleParty: 'Cliente', description: 'La base de datos debe permanecer en una subred privada dentro de la VPC.', recommendation: 'Aísla la base de datos y limita su acceso a la capa de aplicación.' },
    { id: 'compliance', title: 'Cumplimiento', status: settings.compliance ? 'green' : 'yellow', category: 'Cumplimiento', responsibleParty: 'Compartido', description: 'Políticas, retención de datos y registro de actividad.', recommendation: 'Documenta los controles y conserva las evidencias.' },
  ];
}
export function evaluateArchitecture(proposal: CloudProposal | null, services: string[], costs: CostEstimate[], users: IAMUser[], security: SecuritySettings) {
  const rules = [
    { group: 'Red', label: 'VPC para aislamiento de red', pass: services.includes('vpc') },
    { group: 'Red', label: 'Route 53 para resolución DNS', pass: services.includes('route53') },
    { group: 'Red', label: 'CloudFront para distribución de contenido', pass: services.includes('cloudfront') },
    { group: 'Disponibilidad', label: 'EC2 para la capa de aplicación', pass: services.includes('ec2') },
    { group: 'Disponibilidad', label: 'RDS para persistencia relacional', pass: services.includes('rds') },
    { group: 'Disponibilidad', label: 'Objetivo de alta disponibilidad', pass: /Multi-AZ|Multi-Region/i.test(proposal?.availabilityLevel ?? '') },
    { group: 'Seguridad', label: 'MFA en todas las identidades', pass: users.length > 0 && users.every(u => u.mfaEnabled) },
    { group: 'Seguridad', label: 'Cifrado contemplado', pass: security.encryption },
    { group: 'Seguridad', label: 'Base de datos privada dentro de VPC', pass: security.privateDatabase && services.includes('vpc') && services.includes('rds') },
    { group: 'Costos', label: 'Servicios incluidos en el presupuesto', pass: services.length > 0 && services.every(id => costs.some(c => c.serviceId === id && c.quantity > 0 && c.hoursPerMonth > 0)) },
  ];
  const score = Math.round(rules.filter(r => r.pass).length / rules.length * 100);
  const groups = ['Seguridad', 'Disponibilidad', 'Red', 'Costos'].map(name => {
    const entries = rules.filter(r => r.group === name);
    return { name, score: Math.round(entries.filter(r => r.pass).length / entries.length * 100) };
  });
  return { score, groups, strengths: rules.filter(r => r.pass).map(r => r.label), reviews: rules.filter(r => !r.pass).map(r => r.label) };
}
