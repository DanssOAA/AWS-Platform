import { afterEach,beforeEach,describe,it,expect,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../src/context/AppContext';
import { AnalyzedAppProvider } from '../src/context/AnalyzedAppProvider';
import { Dashboard } from '../src/pages/Dashboard';
import { Costs } from '../src/pages/Costs';
import { Planning } from '../src/pages/Planning';
import { NetworkPage } from '../src/pages/Network';
import { project,run,detail } from './fixtures/analyzed-project';
const mocks=vi.hoisted(()=>({ workspace:null as any, insert:vi.fn() }));
vi.mock('../src/context/AuthContext',()=>({useAuth:()=>({user:{id:'owner-a'}})}));
vi.mock('../src/context/ProjectWorkspaceContext',()=>({useProjectWorkspace:()=>mocks.workspace,useOptionalProjectWorkspace:()=>mocks.workspace}));
vi.mock('../src/lib/supabase',()=>({errorMessage:(e:Error)=>e.message, requireSupabase:()=>({from:()=>{const q:any={select:()=>q,eq:()=>q,order:()=>q,abortSignal:()=>Promise.resolve({data:[],error:null}),insert:mocks.insert};return q;}})}));
vi.mock('recharts',()=>{
  const Box=({children}:any)=><div>{children}</div>;const Plot=({data,children}:any)=><div data-testid="original-chart"><span>{JSON.stringify(data)}</span>{children}</div>;
  return {ResponsiveContainer:Box,PieChart:Box,Pie:Plot,BarChart:Plot,Bar:Box,Cell:Box,Tooltip:Box,Legend:Box,XAxis:Box,YAxis:Box,CartesianGrid:Box};
});
function Frame({children}:{children:React.ReactNode}){return <MemoryRouter><AppProvider projectMode><AnalyzedAppProvider>{children}</AnalyzedAppProvider></AppProvider></MemoryRouter>;}
beforeEach(()=>{localStorage.clear();mocks.workspace={project:structuredClone(project),run:structuredClone(run),detail:structuredClone(detail)};mocks.insert.mockResolvedValue({error:null});});afterEach(cleanup);
describe('vistas originales conectadas',()=>{
 it('vacía toda la vista del dashboard y restaura sus datos guardados sin borrarlos',async()=>{
   render(<Frame><Dashboard /></Frame>);await screen.findByText(project.name);
   fireEvent.click(screen.getByRole('button',{name:'Vaciar dashboard'}));fireEvent.click(screen.getAllByRole('button',{name:'Vaciar dashboard'})[1]);
   expect(screen.getByText('Dashboard vacío')).toBeTruthy();expect(screen.queryByText('Costos por categoría')).toBeNull();expect(screen.queryByText('Evaluación de arquitectura')).toBeNull();
   fireEvent.click(screen.getByRole('button',{name:'Restaurar datos'}));expect(screen.getByTestId('original-chart').textContent).toContain('"value":5');expect(screen.getByText(project.name)).toBeTruthy();expect(mocks.insert).not.toHaveBeenCalled();
 });
 it('conserva el gráfico de categorías y lo alimenta con el proyecto seleccionado',async()=>{
   const view=render(<Frame><Dashboard /></Frame>);await screen.findByText(project.name);
   expect(screen.getByText('Costos por categoría')).toBeTruthy();expect(screen.getByTestId('original-chart').textContent).toContain('"value":5');
   mocks.workspace={project:{...project,id:'project-b',name:'Proyecto B'},run:{...run,id:'analysis-b'},detail:{...detail,recommendations:[]}};
   view.rerender(<Frame><Dashboard /></Frame>);expect(screen.queryByText('Amazon S3')).toBeNull();expect(screen.getByText('Proyecto B')).toBeTruthy();expect(screen.queryByTestId('original-chart')).toBeNull();
 });
 it('conserva barras, simulador y guardado con IDs del proyecto y análisis',async()=>{
   render(<Frame><Costs /></Frame>);expect(screen.getByTestId('original-chart').textContent).toContain('"CostoMensual":5');
   fireEvent.change(screen.getByLabelText('Cantidad de Amazon S3'),{target:{value:'2'}});expect(screen.getByTestId('original-chart').textContent).toContain('"CostoMensual":10');
   fireEvent.click(screen.getByRole('button',{name:'Guardar presupuesto'}));await waitFor(()=>expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({monthly_cost:10,detail:expect.objectContaining({projectId:'project-a',analysisId:'analysis-a'})})));
 });
 it('precarga el formulario original con la propuesta analizada',()=>{
   render(<Frame><Planning /></Frame>);expect((screen.getByLabelText('Nombre de la solución *') as HTMLInputElement).value).toBe(project.name);expect((screen.getByLabelText('Usuarios estimados') as HTMLInputElement).value).toBe('500');expect(screen.getByText('Propuestas guardadas')).toBeTruthy();
 });
 it('conserva editor/importación/exportación y siembra servicios sin inventar conexiones',()=>{
   render(<Frame><NetworkPage /></Frame>);expect(screen.getByText('Diseñador de red')).toBeTruthy();expect(screen.getAllByText('Amazon S3').length).toBeGreaterThan(0);expect(screen.getByRole('button',{name:/Exportar/})).toBeTruthy();expect(screen.getByRole('button',{name:/Importar/})).toBeTruthy();
 });
});
