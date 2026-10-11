import { describe, it, expect } from 'vitest';
import { projectModuleData } from '../src/lib/projectModuleData';
import { serviceEstimate } from '../src/lib/projectEstimates';
import { parseDesign } from '../src/lib/networkDesign';
import { project,run,detail } from './fixtures/analyzed-project';
describe('datos para las vistas originales',()=>{
  it('usa solo servicios del análisis, conserva sus IDs y alimenta costos y lienzo',()=>{
    const model=projectModuleData(project,run,detail);
    expect(model.services.map(s=>s.id)).toEqual(['svc-a']);
    expect(model.costs[0]).toMatchObject({monthlyCost:5,annualCost:60,estimateMin:2,estimateMax:8});
    expect(model.proposal.solutionName).toBe(project.name); expect(model.checks[0].status).toBe('red');
    expect(parseDesign(JSON.stringify(model.design)).nodes[0].id).toBe('svc-a');
    expect(model.design.edges).toEqual([]);
  });
  it('no convierte costos desconocidos en cero y permite servicios fuera del catálogo',()=>{
    const data=structuredClone(detail);data.recommendations[0].suggested_configuration.cost_estimate=undefined;
    data.recommendations[0].service_code='nuevo';data.recommendations[0].service_name='Servicio particular';
    const result=projectModuleData(project,run,data); expect(result.costs).toEqual([]); expect(result.services[0].name).toBe('Servicio particular');expect(result.design.nodes[0].type).toBe('service');
  });
  it('respeta costo cero explícito y rechaza NaN y rangos invertidos',()=>{
    const r=structuredClone(detail.recommendations[0]);r.suggested_configuration.cost_estimate!.monthly_min_usd=0;r.suggested_configuration.cost_estimate!.monthly_max_usd=0;
    expect(serviceEstimate(r)?.min).toBe(0);r.suggested_configuration.cost_estimate!.monthly_max_usd=-1;expect(serviceEstimate(r)).toBeNull();r.suggested_configuration.cost_estimate!.monthly_max_usd=NaN;expect(serviceEstimate(r)).toBeNull();
  });
});
