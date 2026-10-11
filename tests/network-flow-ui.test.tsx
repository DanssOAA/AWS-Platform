import { afterEach,beforeEach,describe,it,expect,vi } from 'vitest';
import { act,cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react';
import { NetworkEditor } from '../src/components/NetworkEditor';
import { createNode, type NetworkDesign } from '../src/lib/networkDesign';
const seed:NetworkDesign={version:1,nodes:[{...createNode('service',60,60),id:'service',name:'Servicio del proyecto'}],edges:[]};
const generated:NetworkDesign={...seed,nodes:[{...createNode('internet',60,60),id:'entry',name:'Usuario'},...seed.nodes.map(n=>({...n,x:460}))],edges:[{id:'edge',source:'entry',target:'service',label:'HTTPS',explanation:'El usuario solicita los datos del proyecto.',assumed:true}],flow:{summary:'Flujo del proyecto',assumptions:['Uso de HTTPS propuesto']}};
beforeEach(()=>localStorage.clear());afterEach(cleanup);
describe('botones del flujo',()=>{
  it('genera una sola vez, recorre, permite deshacer/rehacer y conserva las conexiones al recargar',async()=>{
    let complete:(v:NetworkDesign)=>void=()=>{};const generate=vi.fn(()=>new Promise<NetworkDesign>(resolve=>{complete=resolve;}));
    const view=render(<NetworkEditor seed={seed} storageKey="project-a" onGenerateFlow={generate}/>);
    fireEvent.click(screen.getByRole('button',{name:'Generar flujo del proyecto'}));fireEvent.click(screen.getByRole('button',{name:'Generando flujo…'}));expect(generate).toHaveBeenCalledTimes(1);
    await act(async()=>{complete(generated);});expect(screen.getByText('Conexiones (1)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Recorrer flujo'}));expect(within(screen.getByRole('region',{name:'Recorrido del flujo'})).getByText('El usuario solicita los datos del proyecto.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Deshacer cambio'}));expect(screen.getByText('Conexiones (0)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Rehacer cambio'}));view.unmount();render(<NetworkEditor seed={seed} storageKey="project-a" onGenerateFlow={generate}/>);expect(screen.getByText('Conexiones (1)')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('project-a')!).flow.summary).toBe('Flujo del proyecto');
  });
  it('conserva el lienzo cuando falla Gemini y muestra el error',async()=>{
    render(<NetworkEditor seed={seed} onGenerateFlow={async()=>{throw new Error('Cuota agotada');}}/>);fireEvent.click(screen.getByRole('button',{name:'Generar flujo del proyecto'}));expect((await screen.findByRole('alert')).textContent).toContain('Cuota agotada');expect(screen.getByRole('button',{name:'Seleccionar Servicio del proyecto'})).toBeTruthy();
  });
  it('no escribe ni muestra el resultado tardío de un proyecto en el siguiente',async()=>{
    let complete:(v:NetworkDesign)=>void=()=>{};const generate=()=>new Promise<NetworkDesign>(r=>{complete=r;});
    const view=render(<NetworkEditor key="a" seed={seed} storageKey="project-a" onGenerateFlow={generate}/>);fireEvent.click(screen.getByRole('button',{name:'Generar flujo del proyecto'}));
    view.rerender(<NetworkEditor key="b" seed={{version:1,nodes:[],edges:[]}} storageKey="project-b"/>);await act(async()=>{complete(generated);});expect(screen.queryByRole('button',{name:'Seleccionar Usuario'})).toBeNull();expect(localStorage.getItem('project-b')).toBeNull();
  });
  it('recupera el flujo guardado cuando llega la lectura y protege un borrador editado',async()=>{
    const view=render(<NetworkEditor seed={seed} storageKey="project-a"/>);view.rerender(<NetworkEditor seed={generated} storageKey="project-a"/>);await screen.findByText('Conexiones (1)');
    fireEvent.click(screen.getByRole('button',{name:'Añadir Amazon EC2'}));view.rerender(<NetworkEditor seed={seed} storageKey="project-a"/>);expect(screen.getByRole('button',{name:'Seleccionar Amazon EC2'})).toBeTruthy();
  });
});
