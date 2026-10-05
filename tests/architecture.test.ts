import { describe, expect, it } from 'vitest';
import { evaluateArchitecture, getSecurityChecks, DEFAULT_SECURITY } from '../src/lib/architecture';
import { DEFAULT_PROPOSAL, INITIAL_COST_ESTIMATES, IAM_USERS } from '../src/data/awsServices';
describe('Reglas de arquitectura', () => {
  it('reduce el score al quitar la VPC, cifrado y aislamiento de base de datos', () => {
    const services = ['vpc', 'route53', 'cloudfront', 'ec2', 'rds'];
    const costs = services.map(serviceId => ({ ...INITIAL_COST_ESTIMATES[0], serviceId }));
    const baseline = evaluateArchitecture(DEFAULT_PROPOSAL, services, costs, IAM_USERS, DEFAULT_SECURITY);
    const unsafe = evaluateArchitecture(DEFAULT_PROPOSAL, services.filter(id => id !== 'vpc'), costs, IAM_USERS, { ...DEFAULT_SECURITY, encryption: false, privateDatabase: false });
    expect(unsafe.score).toBe(baseline.score - 30);
    expect(unsafe.reviews).toContain('Base de datos privada dentro de VPC');
  });
  it('MFA, cifrado y claves cambian los indicadores de seguridad', () => {
    const users = IAM_USERS.map(u => ({ ...u, mfaEnabled: true }));
    const checks = getSecurityChecks(users, { ...DEFAULT_SECURITY, encryption: false, rotatedKeys: users.map(u => u.id) }, ['vpc', 'iam']);
    expect(checks.find(c => c.id === 'mfa')?.status).toBe('green');
    expect(checks.find(c => c.id === 'keys')?.status).toBe('green');
    expect(checks.find(c => c.id === 'encryption')?.status).toBe('red');
  });
});
