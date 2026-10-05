import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowRightLeft, Boxes, Cable, Check, Cloud, Code2, Database, Download, Globe, Grip, HardDrive, Layers, Minus, MousePointer2, Network, Plus, Redo2, Router, Server, Shield, Trash2, Undo2, Upload, Zap } from 'lucide-react';
import { BOARD, NETWORK_PARTS, connectNodes, createNode, emptyDesign, isSpace, parseDesign, partFor, position, removeNode, type DesignNode, type NetworkDesign, type PartType } from '../lib/networkDesign';

const STORAGE_KEY = 'cloudops.network-draft.v1';
const categories = ['Espacios', 'Red y acceso', 'Cómputo', 'Datos'];
const partIcons = { vpc: Layers, az: Layers, 'public-subnet': Network, 'private-subnet': Shield, internet: Globe, route53: Network, cloudfront: Cloud, waf: Shield, igw: Router, nat: ArrowRightLeft, alb: ArrowRightLeft, api: Router, ec2: Server, lambda: Code2, ecs: Boxes, rds: Database, dynamodb: Zap, s3: HardDrive };
function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { design: raw ? parseDesign(raw) : emptyDesign(), message: raw ? 'Borrador recuperado' : 'Borrador local' };
  } catch { return { design: emptyDesign(), message: 'No se pudo recuperar el borrador. Puedes importar una copia.' }; }
}
type Drag = { id: string; clientX: number; clientY: number; x: number; y: number; nextX: number; nextY: number };

export function NetworkEditor({ expanded = false }: { expanded?: boolean }) {
  const [initial] = useState(loadDraft);
  const [history, setHistory] = useState<{ past: NetworkDesign[]; present: NetworkDesign; future: NetworkDesign[] }>({ past: [], present: initial.design, future: [] });
  const design = history.present;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'move' | 'connect'>('move');
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const [moving, setMoving] = useState<Drag | null>(null);
  const drag = useRef<Drag | null>(null);
  const [status, setStatus] = useState(initial.message);
  const [saveError, setSaveError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const changed = useRef(false);
  const viewport = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = design.nodes.find(node => node.id === selectedId);
  const edge = design.edges.find(item => item.id === selectedId);
  const nodes = design.nodes.map(node => moving?.id === node.id ? { ...node, x: moving.nextX, y: moving.nextY } : node);

  useEffect(() => {
    if (!changed.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(design)); setSaveError(''); }
    catch { setSaveError('No se pudo guardar en este navegador. Exporta una copia para conservar tu red.'); }
  }, [design]);

  function commit(next: NetworkDesign) {
    if (next === design) return;
    changed.current = true;
    setHistory(current => ({ past: [...current.past, current.present].slice(-50), present: next, future: [] }));
  }
  function travel(direction: 'undo' | 'redo') {
    changed.current = true; setSelectedId(null); setSourceId(null);
    setHistory(current => direction === 'undo' && current.past.length
      ? { past: current.past.slice(0, -1), present: current.past[current.past.length - 1], future: [current.present, ...current.future] }
      : direction === 'redo' && current.future.length
        ? { past: [...current.past, current.present], present: current.future[0], future: current.future.slice(1) } : current);
  }
  function add(type: PartType, point?: { x: number; y: number }) {
    if (design.nodes.length >= 200) { setStatus('El lienzo admite hasta 200 componentes.'); return; }
    const node = createNode(type, point?.x ?? (viewport.current?.scrollLeft ?? 0) / zoom + 40 + design.nodes.length % 6 * 40, point?.y ?? (viewport.current?.scrollTop ?? 0) / zoom + 40 + design.nodes.length % 6 * 40);
    commit({ ...design, nodes: [...design.nodes, node] }); setSelectedId(node.id); setStatus(`${node.name} añadido`);
  }
  function select(id: string) {
    setSelectedId(id);
    if (mode !== 'connect') return;
    if (!sourceId) { setSourceId(id); setStatus('Selecciona el componente de destino.'); return; }
    if (design.edges.length >= 1000) { setStatus('El lienzo admite hasta 1000 conexiones.'); return; }
    const next = connectNodes(design, sourceId, id);
    commit(next); setSourceId(null); setStatus(next === design ? 'Selecciona dos componentes distintos sin una conexión repetida.' : 'Conexión añadida');
  }
  function updateNode(patch: Partial<DesignNode>) {
    if (!selected) return;
    const next = { ...selected, ...patch };
    next.width = Math.max(100, Math.min(next.width, BOARD.width - selected.x));
    next.height = Math.max(60, Math.min(next.height, BOARD.height - selected.y));
    commit({ ...design, nodes: design.nodes.map(node => node.id === selected.id ? { ...next, ...position(next, next.x, next.y) } : node) });
  }
  function startDrag(event: PointerEvent<HTMLButtonElement>, node: DesignNode) {
    if (mode !== 'move' || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(node.id);
    drag.current = { id: node.id, clientX: event.clientX, clientY: event.clientY, x: node.x, y: node.y, nextX: node.x, nextY: node.y };
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>, node: DesignNode) {
    if (!drag.current || drag.current.id !== node.id) return;
    const point = position(node, drag.current.x + (event.clientX - drag.current.clientX) / zoom, drag.current.y + (event.clientY - drag.current.clientY) / zoom);
    drag.current = { ...drag.current, nextX: point.x, nextY: point.y };
    setMoving(drag.current);
  }
  function endDrag() {
    const value = drag.current;
    if (value && (value.x !== value.nextX || value.y !== value.nextY)) commit({ ...design, nodes: design.nodes.map(node => node.id === value.id ? { ...node, x: value.nextX, y: value.nextY } : node) });
    drag.current = null; setMoving(null);
  }
  function erase() {
    if (selected) commit(removeNode(design, selected.id));
    else if (edge) commit({ ...design, edges: design.edges.filter(item => item.id !== edge.id) });
    setSelectedId(null); setSourceId(null);
  }
  function exportDraft() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'cloudops-red.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Copia exportada');
  }
  async function importDraft(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error('Too large');
      const next = parseDesign(await file.text()); commit(next); setSelectedId(null); setSourceId(null); setStatus('Red importada. Puedes deshacer el cambio.');
    } catch { setStatus('No se pudo importar. Selecciona una copia JSON exportada por CloudOps, de hasta 1 MB.'); }
    if (fileInput.current) fileInput.current.value = '';
  }

  return <div className="network-editor overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap gap-2">
        <button className="editor-control" aria-pressed={mode === 'move'} onClick={() => { setMode('move'); setSourceId(null); }}><MousePointer2 size={15} /> Mover</button>
        <button className="editor-control" aria-pressed={mode === 'connect'} onClick={() => { setMode('connect'); setSourceId(null); setStatus('Selecciona el origen y después el destino.'); }}><Cable size={15} /> Conectar</button>
        <button className="editor-control" aria-label="Deshacer cambio" disabled={!history.past.length} onClick={() => travel('undo')}><Undo2 size={16} /></button>
        <button className="editor-control" aria-label="Rehacer cambio" disabled={!history.future.length} onClick={() => travel('redo')}><Redo2 size={16} /></button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="editor-control" onClick={exportDraft}><Download size={15} /> Exportar</button>
        <button className="editor-control" onClick={() => fileInput.current?.click()}><Upload size={15} /> Importar</button>
        <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Importar red JSON" className="sr-only" onChange={event => void importDraft(event.target.files?.[0])} />
        <button className="editor-control" disabled={!design.nodes.length} onClick={() => setConfirmClear(true)}><Trash2 size={15} /> Vaciar lienzo</button>
      </div>
    </div>
    {confirmClear && <div role="alert" className="flex flex-wrap items-center gap-3 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">¿Vaciar todos los componentes y conexiones?<button className="editor-control" onClick={() => { commit(emptyDesign()); setSelectedId(null); setSourceId(null); setConfirmClear(false); }}>Confirmar vaciado</button><button className="editor-control" onClick={() => setConfirmClear(false)}>Cancelar</button></div>}
    <div className="grid min-w-0 lg:grid-cols-[190px_minmax(0,1fr)_240px]">
      <aside aria-label="Piezas de red" className="border-b border-slate-200 p-3 lg:border-b-0 lg:border-r dark:border-slate-700 overflow-y-auto" style={{ maxHeight: expanded ? 'calc(100dvh - 210px)' : 640 }}>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Componentes</h3>
        <p className="mb-4 text-xs text-slate-500">Arrastra al lienzo o pulsa para añadir.</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-1">{categories.map(category => <div key={category}>
          <h4 className="mb-2 text-[11px] font-semibold text-slate-500">{category}</h4>
          <div className="space-y-1">{NETWORK_PARTS.filter(part => part.category === category).map(part => { const Icon = partIcons[part.type]; return <button key={part.type} type="button" draggable onDragStart={event => { event.dataTransfer.setData('application/cloudops-part', part.type); event.dataTransfer.effectAllowed = 'copy'; }} onClick={() => add(part.type)} aria-label={`Añadir ${part.name}`} className="flex w-full items-center gap-2 rounded-lg border border-transparent p-2 text-left text-xs hover:border-slate-300 hover:bg-slate-50 dark:hover:border-slate-600 dark:hover:bg-slate-800">
            <Icon size={16} style={{ color: part.color }} className="shrink-0" />{part.name}<Plus size={12} className="ml-auto shrink-0 text-slate-400" />
          </button>; })}</div>
        </div>)}</div>
      </aside>
      <div className="relative min-w-0 bg-[#070f20]">
        <div ref={viewport} tabIndex={0} aria-label="Lienzo de red" className="overflow-auto" style={{ height: expanded ? 'max(420px, calc(100dvh - 210px))' : 640 }}
          onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
          onDrop={event => { event.preventDefault(); const type = event.dataTransfer.getData('application/cloudops-part'); if (!NETWORK_PARTS.some(p => p.type === type)) return; const rect = event.currentTarget.getBoundingClientRect(); add(type as PartType, { x: (event.clientX - rect.left + event.currentTarget.scrollLeft) / zoom, y: (event.clientY - rect.top + event.currentTarget.scrollTop) / zoom }); }}>
          <div style={{ width: BOARD.width * zoom, height: BOARD.height * zoom }}>
            <div className="network-board relative origin-top-left" style={{ width: BOARD.width, height: BOARD.height, transform: `scale(${zoom})` }}>
              {nodes.filter(node => isSpace(node.type)).map(node => <div key={`${node.id}-space`} className="pointer-events-none absolute rounded-2xl border border-dashed" style={{ left: node.x, top: node.y, width: node.width, height: node.height, borderColor: partFor(node.type).color, backgroundColor: `${partFor(node.type).color}08` }} />)}
              <svg viewBox={`0 0 ${BOARD.width} ${BOARD.height}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-label="Conexiones de red">
                <defs><marker id="network-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#67e8f9" /></marker></defs>
                {design.edges.map(item => {
                  const from = nodes.find(n => n.id === item.source)!; const to = nodes.find(n => n.id === item.target)!;
                  const fromY = from.y + (isSpace(from.type) ? 24 : from.height / 2); const toY = to.y + (isSpace(to.type) ? 24 : to.height / 2);
                  const forward = to.x >= from.x; const x1 = from.x + (forward ? from.width : 0); const x2 = to.x + (forward ? 0 : to.width); const mid = (x1 + x2) / 2;
                  const path = `M ${x1} ${fromY} C ${mid} ${fromY}, ${mid} ${toY}, ${x2} ${toY}`;
                  return <g key={item.id}>
                    <path d={path} stroke={selectedId === item.id ? '#fff' : '#67e8f9'} strokeWidth={selectedId === item.id ? 3 : 2} strokeDasharray="7 6" fill="none" markerEnd="url(#network-arrow)" className="network-edge-flow" />
                    <path d={path} stroke="transparent" strokeWidth="20" fill="none" className="pointer-events-auto cursor-pointer" onClick={() => { setSelectedId(item.id); setSourceId(null); }} />
                    <g transform={`translate(${mid}, ${(fromY + toY) / 2 - 13})`}><rect x="-55" y="-12" width="110" height="22" rx="5" fill="#17243a" /><text textAnchor="middle" y="3" fill="#cbd5e1" fontSize="11">{item.label.slice(0, 18)}</text></g>
                  </g>;
                })}
              </svg>
              {nodes.map(node => {
                const part = partFor(node.type); const space = isSpace(node.type); const Icon = partIcons[node.type];
                return <button key={node.id} type="button" aria-label={`Seleccionar ${node.name}`} aria-pressed={selectedId === node.id} onClick={() => select(node.id)}
                  onPointerDown={event => startDrag(event, node)} onPointerMove={event => moveDrag(event, node)} onPointerUp={endDrag} onPointerCancel={() => { drag.current = null; setMoving(null); }}
                  onKeyDown={event => { const delta = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[event.key]; if (delta && mode === 'move') { event.preventDefault(); commit({ ...design, nodes: design.nodes.map(item => item.id === node.id ? { ...item, ...position(item, item.x + delta[0], item.y + delta[1]) } : item) }); } }}
                  className={`absolute touch-none select-none rounded-xl border px-3 py-2 text-left text-white shadow-lg ${mode === 'connect' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'} ${selectedId === node.id || sourceId === node.id ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950' : ''}`}
                  style={{ left: node.x, top: node.y, width: node.width, height: space ? 48 : node.height, borderColor: part.color, backgroundColor: space ? '#142239' : '#152033', zIndex: space ? 10 : 20 }}>
                  <span className="flex items-center gap-2"><Icon size={18} style={{ color: part.color }} className="shrink-0" /><span className="truncate text-xs font-semibold">{node.name}</span><Grip size={12} className="ml-auto shrink-0 text-slate-500" /></span>
                  {(!space || node.zone || node.detail) && <span className={`${space ? 'mt-0.5' : 'mt-2'} block truncate text-[10px] text-slate-400`}>{[node.zone, node.detail || (!space ? part.name : '')].filter(Boolean).join(' · ')}</span>}
                </button>;
              })}
              {!nodes.length && <div className="pointer-events-none absolute left-8 top-10 max-w-[300px] rounded-2xl border border-dashed border-slate-600 p-7 text-slate-400"><Layers size={30} className="mb-4 text-blue-400" /><h3 className="text-lg font-semibold text-white">Construye tu red</h3><p className="mt-2 text-sm leading-relaxed">Añade una VPC, subredes y servicios. Conecta las piezas para definir el flujo.</p></div>}
            </div>
          </div>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-900 p-1.5 text-white">
          <button className="rounded p-2 hover:bg-slate-700" aria-label="Alejar lienzo" disabled={zoom <= 0.4} onClick={() => setZoom(value => Math.max(0.4, +(value - 0.2).toFixed(1)))}><Minus size={15} /></button>
          <span className="w-10 text-center text-xs">{Math.round(zoom * 100)}%</span>
          <button className="rounded p-2 hover:bg-slate-700" aria-label="Acercar lienzo" disabled={zoom >= 1.6} onClick={() => setZoom(value => Math.min(1.6, +(value + 0.2).toFixed(1)))}><Plus size={15} /></button>
          <button className="rounded px-2 py-1 text-xs hover:bg-slate-700" onClick={() => { setZoom(Math.max(0.2, Math.min((viewport.current?.clientWidth ?? 900) / BOARD.width, (viewport.current?.clientHeight ?? 640) / BOARD.height))); if (viewport.current) { viewport.current.scrollLeft = 0; viewport.current.scrollTop = 0; } }}>Ver todo</button>
        </div>
      </div>
      <aside aria-label="Propiedades de la red" className="space-y-4 overflow-y-auto border-t border-slate-200 p-4 lg:border-l lg:border-t-0 dark:border-slate-700" style={{ maxHeight: expanded ? 'calc(100dvh - 210px)' : 640 }}>
        <h3 className="text-sm font-bold">{selected ? 'Componente' : edge ? 'Conexión' : 'Propiedades'}</h3>
        {selected ? <>
          <label className="block text-xs">Nombre<input className="field mt-2" value={selected.name} maxLength={80} onChange={event => updateNode({ name: event.target.value })} /></label>
          <p className="text-xs text-slate-500">{partFor(selected.type).name}</p>
          <label className="block text-xs">CIDR / Nota<input className="field mt-2" value={selected.detail} maxLength={120} placeholder={isSpace(selected.type) ? '10.0.0.0/16' : 'HTTPS · 443'} onChange={event => updateNode({ detail: event.target.value })} /></label>
          <label className="block text-xs">Zona de disponibilidad<input className="field mt-2" value={selected.zone} maxLength={80} placeholder="Etiqueta de zona" onChange={event => updateNode({ zone: event.target.value })} /></label>
          <div className="grid grid-cols-2 gap-2">{(['x', 'y'] as const).map(axis => <label key={axis} className="text-xs">Posición {axis.toUpperCase()}<input type="number" step="20" min="0" max={axis === 'x' ? BOARD.width - selected.width : BOARD.height - selected.height} className="field mt-2" value={selected[axis]} onChange={event => updateNode({ [axis]: Number(event.target.value) || 0 })} /></label>)}</div>
          {isSpace(selected.type) && <div className="grid grid-cols-2 gap-2">{(['width', 'height'] as const).map(dimension => <label key={dimension} className="text-xs">{dimension === 'width' ? 'Ancho' : 'Alto'}<input type="number" step="20" min={dimension === 'width' ? 100 : 60} max={dimension === 'width' ? BOARD.width - selected.x : BOARD.height - selected.y} className="field mt-2" value={selected[dimension]} onChange={event => updateNode({ [dimension]: Number(event.target.value) || 100 })} /></label>)}</div>}
          <p className="text-[11px] text-slate-500">Mueve con el puntero o las flechas del teclado. Los espacios agrupan visualmente las piezas.</p>
        </> : edge ? <>
          <p className="text-xs text-slate-500">{design.nodes.find(node => node.id === edge.source)?.name} → {design.nodes.find(node => node.id === edge.target)?.name}</p>
          <label className="block text-xs">Protocolo / Puerto<input className="field mt-2" maxLength={100} value={edge.label} onChange={event => commit({ ...design, edges: design.edges.map(item => item.id === edge.id ? { ...item, label: event.target.value } : item) })} /></label>
        </> : <p className="text-xs leading-relaxed text-slate-500">Selecciona una pieza o conexión para editarla.</p>}
        {(selected || edge) && <button className="editor-control text-rose-600 dark:text-rose-400" onClick={erase}><Trash2 size={15} />{edge ? 'Eliminar conexión' : 'Eliminar componente'}</button>}
        <div className="border-t border-slate-200 pt-4 dark:border-slate-700"><h4 className="mb-2 text-xs font-semibold">Conexiones ({design.edges.length})</h4><div className="space-y-1">{design.edges.map(item => <button key={item.id} className={`block w-full rounded-lg p-2 text-left text-[11px] ${selectedId === item.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} onClick={() => { setSelectedId(item.id); setSourceId(null); }}>{design.nodes.find(n => n.id === item.source)?.name} → {design.nodes.find(n => n.id === item.target)?.name}<span className="block text-slate-500">{item.label}</span></button>)}</div></div>
      </aside>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500 dark:border-slate-700"><span role="status" className="flex items-center gap-2"><Check size={13} />{status}</span><span>{design.nodes.length} componentes · {design.edges.length} conexiones · Guardado local automático</span></div>
    {saveError && <p role="alert" className="error-box m-3">{saveError}</p>}
  </div>;
}
