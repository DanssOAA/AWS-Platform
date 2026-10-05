import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExpandablePanel } from '../src/components/ExpandablePanel';
import { NetworkEditor } from '../src/components/NetworkEditor';
import { RegionExplorer } from '../src/components/RegionExplorer';
import { BOARD, connectNodes, createNode, emptyDesign, parseDesign, position, removeNode } from '../src/lib/networkDesign';

const key = 'cloudops.network-draft.v1';
beforeEach(() => {
  localStorage.clear();
  for (const method of ['close', 'show', 'showModal']) Object.defineProperty(HTMLDialogElement.prototype, method, {
    configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = method !== 'close'; }),
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const saved = () => parseDesign(localStorage.getItem(key)!);

describe('Network design integrity', () => {
  it('prevents self-links, missing endpoints and duplicate directed connections', () => {
    const first = createNode('ec2', 40, 40); const second = createNode('rds', 400, 40);
    const design = { ...emptyDesign(), nodes: [first, second] };
    expect(connectNodes(design, first.id, first.id)).toBe(design);
    expect(connectNodes(design, first.id, 'missing')).toBe(design);
    const connected = connectNodes(design, first.id, second.id);
    expect(connected.edges).toHaveLength(1);
    expect(connectNodes(connected, first.id, second.id)).toBe(connected);
    expect(removeNode(connected, second.id).edges).toHaveLength(0);
  });
  it('snaps pieces to the grid and keeps them inside the board', () => {
    const node = createNode('ec2', -100, -90);
    expect([node.x, node.y]).toEqual([0, 0]);
    expect(position(node, 73, 112)).toEqual({ x: 80, y: 120 });
    expect(position(node, 4000, 4000)).toEqual({ x: BOARD.width - node.width, y: BOARD.height - node.height });
  });
  it('rejects invalid or broken imports without trusting external JSON', () => {
    const node = createNode('ec2', 0, 0);
    expect(() => parseDesign('{invalid')).toThrow();
    expect(() => parseDesign(JSON.stringify({ ...emptyDesign(), nodes: [node, node] }))).toThrow();
    expect(() => parseDesign(JSON.stringify({ ...emptyDesign(), nodes: [{ ...node, x: -20 }] }))).toThrow();
    expect(() => parseDesign(JSON.stringify({ ...emptyDesign(), nodes: [node], edges: [{ id: 'a', source: node.id, target: 'missing', label: 'HTTPS' }] }))).toThrow();
  });
});

describe('Build your own network', () => {
  it('starts empty and persists independently added and renamed pieces across mounts', () => {
    const view = render(<NetworkEditor />);
    expect(screen.getByText('Construye tu red')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Amazon EC2' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre' }), { target: { value: 'API de ventas' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Zona de disponibilidad' }), { target: { value: 'Zona 2' } });
    expect(saved().nodes[0]).toMatchObject({ name: 'API de ventas', zone: 'Zona 2' });
    view.unmount(); render(<NetworkEditor />);
    expect(screen.getByRole('button', { name: 'Seleccionar API de ventas' })).toBeTruthy();
  });
  it('connects components, edits the protocol and removes incident edges with undo recovery', () => {
    render(<NetworkEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Amazon EC2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Amazon RDS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Conectar', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar Amazon EC2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar Amazon RDS' }));
    expect(saved().edges).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Amazon EC2 → Amazon RDS/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Protocolo / Puerto' }), { target: { value: 'PostgreSQL · 5432' } });
    expect(saved().edges[0].label).toBe('PostgreSQL · 5432');
    fireEvent.click(screen.getByRole('button', { name: 'Mover', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar Amazon RDS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar componente' }));
    expect(saved().edges).toHaveLength(0); expect(saved().nodes).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer cambio' }));
    expect(saved().edges).toHaveLength(1); expect(saved().nodes).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Rehacer cambio' }));
    expect(saved().nodes).toHaveLength(1);
  });
  it('moves components using keyboard and coordinate fields', () => {
    render(<NetworkEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir VPC' }));
    const piece = screen.getByRole('button', { name: 'Seleccionar VPC' });
    fireEvent.keyDown(piece, { key: 'ArrowRight' });
    expect(saved().nodes[0].x).toBe(60);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Posición Y' }), { target: { value: '120' } });
    expect(saved().nodes[0].y).toBe(120);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Ancho' }), { target: { value: '800' } });
    expect(saved().nodes[0].width).toBe(800);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Posición X' }), { target: { value: '4000' } });
    expect(saved().nodes[0]).toMatchObject({ x: 1000, width: 800 });
  });
  it('supports palette drop coordinates accounting for canvas zoom', () => {
    render(<NetworkEditor />);
    const event = new MouseEvent('drop', { bubbles: true, clientX: 320, clientY: 160 });
    Object.defineProperty(event, 'dataTransfer', { value: { getData: () => 'ec2' } });
    fireEvent(screen.getByLabelText('Lienzo de red'), event);
    expect(saved().nodes[0]).toMatchObject({ type: 'ec2', x: 400, y: 200 });
  });
  it('drags an existing piece at the current zoom and undoes the drag as one action', () => {
    render(<NetworkEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Amazon EC2' }));
    const piece = screen.getByRole('button', { name: 'Seleccionar Amazon EC2' });
    Object.defineProperty(piece, 'setPointerCapture', { value: vi.fn() });
    fireEvent(piece, new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    fireEvent(piece, new MouseEvent('pointermove', { bubbles: true, clientX: 164, clientY: 132 }));
    fireEvent(piece, new MouseEvent('pointerup', { bubbles: true }));
    expect(saved().nodes[0]).toMatchObject({ x: 120, y: 80 });
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer cambio' }));
    expect(saved().nodes[0]).toMatchObject({ x: 40, y: 40 });
  });
  it('exports the current design as a downloadable JSON copy', () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:network-copy');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('cloudops-red.json'); expect(this.href).toBe('blob:network-copy');
    });
    render(<NetworkEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Amazon EC2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar', exact: true }));
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(download).toHaveBeenCalledOnce();
  });
  it('requires a deliberate clear and allows restoring the draft', () => {
    render(<NetworkEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Amazon S3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar lienzo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar', exact: true }));
    expect(saved().nodes).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar lienzo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar vaciado' }));
    expect(saved().nodes).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer cambio' }));
    expect(saved().nodes).toHaveLength(1);
  });
  it('imports valid designs and keeps the previous draft when import fails', async () => {
    render(<NetworkEditor />);
    const payload = JSON.stringify({ ...emptyDesign(), nodes: [createNode('lambda', 60, 80)] });
    fireEvent.change(screen.getByLabelText('Importar red JSON'), { target: { files: [{ size: payload.length, text: async () => payload }] } });
    await screen.findByRole('button', { name: 'Seleccionar AWS Lambda' });
    fireEvent.change(screen.getByLabelText('Importar red JSON'), { target: { files: [{ size: 10, text: async () => 'broken' }] } });
    await screen.findByText(/No se pudo importar/);
    expect(saved().nodes[0].type).toBe('lambda');
  });
  it('reports storage failures without discarding the working diagram', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    render(<NetworkEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Amazon EC2' }));
    expect(screen.getByRole('alert').textContent).toContain('Exporta una copia');
    expect(screen.getByRole('button', { name: 'Seleccionar Amazon EC2' })).toBeTruthy();
  });
});

describe('Expand a single panel without remounting its contents', () => {
  it('preserves the diagram and selection across expansion, Escape and re-expansion', () => {
    render(<ExpandablePanel label="editor de red">{(controls, expanded) => <>{controls}<NetworkEditor expanded={expanded} /></>}</ExpandablePanel>);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Amazon EC2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar editor de red' }));
    expect(screen.getByRole('dialog', { name: 'editor de red' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveProperty('value', 'Amazon EC2');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar editor de red' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reducir editor de red' }));
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveProperty('value', 'Amazon EC2');
  });
  it('expands only the map and preserves its filters and callbacks', async () => {
    const onClear = vi.fn();
    render(<RegionExplorer selectedRegion="us-east-1" onSelectRegion={vi.fn()} onClear={onClear} onReset={vi.fn()} plannedServices={[]} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar región' }), { target: { value: 'Singapur' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar mapa de regiones' }));
    const panel = screen.getByRole('dialog', { name: 'mapa de regiones' });
    expect(panel.textContent).not.toContain('Catálogo AWS');
    expect(screen.getByRole('textbox', { name: 'Buscar región' })).toHaveProperty('value', 'Singapur');
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar', exact: true }));
    expect(onClear).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Reducir mapa de regiones' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Buscar región' })).toHaveProperty('value', 'Singapur'));
  });
});
