import { afterEach,describe,it,expect,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { PdfDownloadButton } from '../src/components/analysis/PdfDownloadButton';
import { project,run,detail } from './fixtures/analyzed-project';
const mocks=vi.hoisted(()=>({download:vi.fn()}));
vi.mock('../src/lib/projectPdf',()=>({downloadTechnicalPdf:mocks.download}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
const input={projectName:project.name,run,data:detail,checked:new Set<string>()};
describe('descarga del informe',()=>{
 it('lee el progreso actual y bloquea clics duplicados durante la descarga',async()=>{
   let done:()=>void=()=>{};mocks.download.mockImplementation(()=>new Promise<void>(resolve=>{done=resolve;}));
   const loadInput=vi.fn().mockResolvedValue({...input,checked:new Set(['finding-f-a'])});
   render(<PdfDownloadButton input={input} loadInput={loadInput}/>);const button=screen.getByRole('button');fireEvent.click(button);fireEvent.click(button);
   await waitFor(()=>expect(mocks.download).toHaveBeenCalledTimes(1));expect(loadInput).toHaveBeenCalledTimes(1);expect(mocks.download.mock.calls[0][0].checked.has('finding-f-a')).toBe(true);expect((button as HTMLButtonElement).disabled).toBe(true);done();await waitFor(()=>expect((button as HTMLButtonElement).disabled).toBe(false));
 });
 it('explica un fallo y permite reintentar; no descarga análisis fallidos',async()=>{
   mocks.download.mockRejectedValueOnce(new Error('No se pudo cargar la tipografía'));
   const view=render(<PdfDownloadButton input={input}/>);fireEvent.click(screen.getByRole('button'));expect((await screen.findByRole('alert')).textContent).toContain('tipografía');
   mocks.download.mockResolvedValueOnce(undefined);fireEvent.click(screen.getByRole('button'));await waitFor(()=>expect(mocks.download).toHaveBeenCalledTimes(2));
   view.rerender(<PdfDownloadButton input={{...input,run:{...run,status:'failed'}}}/>);expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
 });
});
