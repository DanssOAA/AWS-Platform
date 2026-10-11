// @vitest-environment node
import { describe,it,expect } from 'vitest';
import { readFileSync,mkdirSync,writeFileSync } from 'node:fs';
import { createTechnicalPdf,reportCosts,technicalPdfFilename } from '../src/lib/projectPdf';
import { project,run,detail } from './fixtures/analyzed-project';
const fonts={regular:readFileSync('public/fonts/Vera.ttf').toString('base64'),bold:readFileSync('public/fonts/VeraBd.ttf').toString('base64')};
describe('PDF técnico',()=>{
  it('genera PDF paginado con los datos del análisis y nombres seguros',()=>{
    const data=structuredClone(detail);
    data.requirements[0].description+=' Evaluación técnica con información y configuración. '.repeat(90);
    data.recommendations=Array.from({length:9},(_,i)=>({...structuredClone(detail.recommendations[0]),id:`s${i}`,service_name:`Servicio ${i+1} / ${detail.recommendations[0].service_name}`,deployment_order:i+1}));
    const pdf=createTechnicalPdf({projectName:project.name,run,data,checked:new Set(['finding-f-a'])},fonts,new Date('2026-10-11T20:00:00Z'));
    const bytes=Buffer.from(pdf.output('arraybuffer'));expect(bytes.subarray(0,5).toString()).toBe('%PDF-');expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(6);
    expect(technicalPdfFilename('../../Aplicación?',run)).not.toMatch(/[/?]/);
    if(process.env.PDF_QA_OUTPUT){mkdirSync('tmp/pdfs',{recursive:true});writeFileSync('tmp/pdfs/technical-report.pdf',bytes);}
  });
  it('rechaza informes fallidos y no presenta un subtotal como total completo',()=>{
    expect(()=>createTechnicalPdf({projectName:project.name,run:{...run,status:'failed'},data:detail,checked:new Set()},fonts)).toThrow();
    expect(reportCosts(detail.recommendations)).toMatchObject({min:2,max:8,complete:true});
    const missing={...detail.recommendations[0],suggested_configuration:{}};
    expect(reportCosts([missing,...detail.recommendations])).toMatchObject({min:2,max:8,complete:false});expect(reportCosts([missing]).min).toBeNull();
  });
});
