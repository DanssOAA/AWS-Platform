import type { AWSService, CloudProposal, CostEstimate, SecurityCheck, ServiceCategory } from '../types/cloud';
import type { AnalysisDetail, AnalysisRun, Project } from './projectAnalysis';
import { serviceEstimate } from './projectEstimates';
import { createNode, emptyDesign, type PartType } from './networkDesign';

export function serviceCategory(value: string): ServiceCategory {
  if (/rds|aurora|dynamo|database|elasticache|postgres|redis/i.test(value)) return 'Base de Datos';
  if (/s3|ebs|efs|storage|backup/i.test(value)) return 'Almacenamiento';
  if (/iam|cognito|waf|shield|kms|secret|guardduty|security/i.test(value)) return 'Seguridad & IAM';
  if (/vpc|route.?53|cloudfront|gateway|balanc|network|dns|\balb\b/i.test(value)) return 'Redes & CDN';
  if (/watch|trail|athena|kinesis|analytics|quicksight/i.test(value)) return 'Analítica';
  return 'Computación';
}
export function projectModuleData(project: Project, run: AnalysisRun, detail: AnalysisDetail) {
  const context = run.input_context ?? project;
  const services: AWSService[] = detail.recommendations.map(r => {
    const estimate = serviceEstimate(r);
    return { id: r.id, name: r.service_name, category: serviceCategory((r.service_code ?? '') + ' ' + r.service_name), description: r.rationale,
      mainFunction: r.purpose, status: 'Pending', hourlyCost: estimate ? (estimate.min + estimate.max) / 2 / 730 : 0, iconName: 'Cloud',
      details: { tier: r.suggested_configuration.description ?? 'Por definir', sla: context.availability_target == null ? 'Por definir' : `${context.availability_target}% (objetivo)`,
        pricingModel: estimate ? `Estimación mensual: USD ${estimate.min}–${estimate.max}. ${estimate.basis}` : 'Pendiente de estimar', useCases: [r.purpose], keyFeatures: r.assumptions } };
  });
  const costs: CostEstimate[] = detail.recommendations.flatMap((r, i) => {
    const e = serviceEstimate(r); if (!e) return [];
    const monthlyCost = Math.round((e.min + e.max) / 2 * 100) / 100;
    return [{ id: r.id, serviceId: r.id, serviceName: r.service_name, category: services[i].category, quantity: 1, hoursPerMonth: 730,
      hourlyCost: monthlyCost / 730, monthlyCost, annualCost: monthlyCost * 12, estimateMin: e.min, estimateMax: e.max, estimateBasis: e.basis, estimateAssumptions: e.assumptions }];
  });
  const proposal: CloudProposal = { id: project.id, solutionName: project.name, appType: 'Proyecto analizado', description: run.summary ?? context.description ?? '',
    selectedRegion: context.preferred_region ?? 'us-east-1', estimatedUsers: context.expected_users ?? 0, availabilityLevel: context.availability_target == null ? 'Por definir' : `${context.availability_target}%`,
    selectedServices: services.map(s => s.id), migrationGoal: detail.requirements.map(r => r.title).join(' · '), createdAt: run.created_at.slice(0, 10) };
  const checks: SecurityCheck[] = detail.findings.map(f => ({ id: f.id, title: f.title, category: 'Protección Datos', responsibleParty: 'Cliente',
    status: ['resolved','false_positive'].includes(f.verification_status) ? 'green' : ['critical','high'].includes(f.severity) ? 'red' : 'yellow', description: f.description, recommendation: f.remediation }));
  const design = emptyDesign();
  detail.recommendations.forEach((r, i) => {
    const text = `${r.service_code} ${r.service_name}`.toLowerCase();
    const type: PartType = /gateway/.test(text) ? 'api' : /rds|aurora/.test(text) ? 'rds' : /dynamo/.test(text) ? 'dynamodb' : /cloudfront/.test(text) ? 'cloudfront' : /route.?53/.test(text) ? 'route53' : /s3/.test(text) ? 's3' : /lambda/.test(text) ? 'lambda' : /ec2/.test(text) ? 'ec2' : /ecs|fargate/.test(text) ? 'ecs' : /waf/.test(text) ? 'waf' : 'service';
    design.nodes.push({ ...createNode(type, 80 + i % 5 * 300, 100 + Math.floor(i / 5) * 200), id: r.id, name: r.service_name.slice(0,500), detail: (r.suggested_configuration.description ?? r.purpose).slice(0,500), zone: context.preferred_region ?? 'Por definir' });
  });
  return { services, costs, proposal, checks, design };
}
