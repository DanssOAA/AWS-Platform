import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Globe2, Layers, MapPin, Minus, Pause, Play, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { AWS_AZ_SOURCE, AWS_REGION_SOURCE, GLOBAL_REGIONS, REGION_AREAS } from '../data/awsRegions';
import { connectionPath, filterRegions, projectRegion } from '../lib/regionMap';

interface RegionExplorerProps {
  selectedRegion: string;
  onSelectRegion: (code: string) => void;
  onClear: () => void;
  onReset: () => void;
  plannedServices: string[];
}
const mapLabels = new Set(['us-east-1', 'sa-east-1', 'eu-central-1', 'af-south-1', 'ap-south-1', 'ap-northeast-1', 'ap-southeast-2']);
const totalZones = GLOBAL_REGIONS.reduce((sum, region) => sum + region.availabilityZones, 0);

export function RegionExplorer({ selectedRegion, onSelectRegion, onClear, onReset, plannedServices }: RegionExplorerProps) {
  const [inspectedCode, setInspectedCode] = useState(selectedRegion);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [area, setArea] = useState('Todas');
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [moving, setMoving] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const viewport = useRef<HTMLDivElement>(null);
  const region = GLOBAL_REGIONS.find(item => item.code === inspectedCode) ?? GLOBAL_REGIONS[0];
  const visibleRegions = filterRegions(GLOBAL_REGIONS, area, query);
  const activeRegion = GLOBAL_REGIONS.find(item => item.code === selectedRegion);
  const isPrimary = region.code === selectedRegion;
  const connections = visibleRegions.filter(item => item.code !== region.code);

  useEffect(() => { setInspectedCode(selectedRegion); }, [selectedRegion]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const point = projectRegion(region);
    element.scrollLeft = point.x / 1200 * element.scrollWidth - element.clientWidth / 2;
    element.scrollTop = point.y / 600 * element.scrollHeight - element.clientHeight / 2;
  }, [region.code, zoom]);

  function changeArea(next: string) {
    setArea(next); setQuery('');
    const candidates = filterRegions(GLOBAL_REGIONS, next, '');
    if (!candidates.some(item => item.code === inspectedCode)) setInspectedCode(candidates[0]?.code ?? selectedRegion);
    setZoom(next === 'Europa' || next === 'Oriente Medio' ? 4 : next === 'Todas' ? 1 : 2);
  }

  return <section className="region-explorer space-y-6" aria-label="Explorador de regiones AWS" data-motion={moving ? 'running' : 'paused'}>
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#081322] text-white shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-5 px-5 py-6 sm:px-7">
        <div><p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400"><Globe2 size={15} /> Infraestructura global</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Mapa de regiones AWS</h2>
          <p className="mt-2 text-sm text-slate-400">Regiones y zonas de disponibilidad AWS.</p>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div><strong className="block text-2xl font-semibold tabular-nums">{GLOBAL_REGIONS.length}</strong><span className="text-[11px] text-slate-400">Regiones comerciales</span></div>
          <div className="border-l border-slate-700 pl-6"><strong className="block text-2xl font-semibold tabular-nums text-violet-300">{totalZones}</strong><span className="text-[11px] text-slate-400">AZs publicadas</span></div>
        </div>
      </div>

      <div className="border-y border-slate-800 bg-slate-900/60 px-5 py-4 sm:px-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="relative block w-full sm:w-80"><Search size={16} className="absolute left-3 top-3 text-slate-500" /><span className="sr-only">Buscar región</span>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ciudad, país o código de región" className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3 text-xs text-white placeholder:text-slate-500" /></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={showConnections} onClick={() => setShowConnections(value => !value)} className="region-map-control"><Layers size={14} /> Enlaces</button>
            <button type="button" aria-pressed={!moving} onClick={() => setMoving(value => !value)} className="region-map-control">{moving ? <Pause size={14} /> : <Play size={14} />}{moving ? 'Pausar movimiento' : 'Reanudar movimiento'}</button>
            <button type="button" onClick={onClear} className="region-map-control text-rose-300"><Trash2 size={14} /> Vaciar</button>
            <button type="button" onClick={onReset} className="region-map-control"><RotateCcw size={14} /> Restaurar</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filtrar por área geográfica">
          {['Todas', ...REGION_AREAS].map(item => <button key={item} type="button" aria-pressed={area === item} onClick={() => changeArea(item)} className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${area === item ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}`}>{item === 'Todas' ? 'Vista global' : item}</button>)}
        </div>
      </div>

      <div className="relative">
        <div ref={viewport} tabIndex={0} aria-label="Mapa de regiones, desplazable al ampliar" className="region-map-viewport h-[380px] overflow-auto sm:h-[480px] lg:h-[560px]">
          <div className="relative min-h-full" style={{ width: `${zoom * 100}%`, minWidth: 760 * zoom, aspectRatio: '2 / 1' }}>
            <svg viewBox="0 0 1200 600" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              <defs>
                <radialGradient id="map-ocean"><stop stopColor="#102e43" /><stop offset="1" stopColor="#081522" /></radialGradient>
                <pattern id="map-grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 H 0 V 100" fill="none" stroke="#42627a" strokeWidth="0.5" opacity="0.24" /></pattern>
              </defs>
              <rect width="1200" height="600" fill="url(#map-ocean)" />
              <image href="/maps/world.svg" width="1200" height="600" />
              <rect width="1200" height="600" fill="url(#map-grid)" />
              <path d="M0 300H1200" stroke="#5b819a" strokeWidth="0.7" strokeDasharray="2 7" opacity="0.35" />
              {showConnections && connections.map((target, index) => <g key={target.code}>
                {[-1200, 0, 1200].map(offset => <path key={offset} transform={`translate(${offset}, 0)`} d={connectionPath(region, target)} fill="none" stroke="#65d9ed" strokeWidth={target.code === hoveredCode ? 2 : 1} strokeDasharray="5 9" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={target.code === hoveredCode ? 0.95 : 0.34} className="region-map-flow" style={{ animationDelay: `${index * -0.17}s` }} />)}
              </g>)}
            </svg>
            {visibleRegions.map(item => {
              const point = projectRegion(item);
              const inspecting = item.code === region.code;
              const primary = item.code === selectedRegion;
              const labelVisible = inspecting || item.code === hoveredCode || (zoom === 1 && mapLabels.has(item.code));
              return <button key={item.code} type="button" aria-label={`Ver ${item.name} (${item.code}), ${item.availabilityZones} zonas`} aria-pressed={inspecting}
                onClick={() => setInspectedCode(item.code)} onMouseEnter={() => setHoveredCode(item.code)} onMouseLeave={() => setHoveredCode(null)} onFocus={() => setHoveredCode(item.code)} onBlur={() => setHoveredCode(null)}
                style={{ left: `${point.x / 12}%`, top: `${point.y / 6}%`, zIndex: inspecting ? 30 : labelVisible ? 20 : 10 }}
                className="region-map-marker absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full">
                {inspecting && <span className="region-map-ring absolute inset-0 rounded-full border border-cyan-300/50 bg-cyan-400/10" />}
                <span className={`relative h-2.5 w-2.5 rounded-full border shadow-[0_0_12px_currentColor] ${primary ? 'border-amber-200 bg-amber-400 text-amber-400' : inspecting ? 'border-white bg-cyan-300 text-cyan-300' : 'border-emerald-200/90 bg-emerald-400 text-emerald-400'}`} />
                {labelVisible && <span className={`pointer-events-none absolute top-6 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-medium shadow-md ${item.longitude > 125 ? 'right-0' : 'left-4'} ${inspecting ? 'border-cyan-500/40 bg-[#0b2638] text-cyan-100' : 'border-slate-700/50 bg-slate-950/85 text-slate-300'}`}>{item.name}{inspecting && <span className="ml-2 text-cyan-400">{item.availabilityZones} AZ</span>}</span>}
              </button>;
            })}
          </div>
        </div>
        <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl border border-slate-600/60 bg-slate-950/90 p-1.5 shadow-lg">
          <button type="button" aria-label="Alejar mapa" onClick={() => setZoom(value => Math.max(1, value - 0.5))} disabled={zoom === 1} className="rounded-lg p-2 hover:bg-slate-800"><Minus size={15} /></button>
          <span className="w-10 text-center font-mono text-xs text-slate-300">{zoom.toFixed(1)}×</span>
          <button type="button" aria-label="Ampliar mapa" onClick={() => setZoom(value => Math.min(4, value + 0.5))} disabled={zoom === 4} className="rounded-lg p-2 hover:bg-slate-800"><Plus size={15} /></button>
          <button type="button" aria-label="Restablecer vista global" onClick={() => changeArea('Todas')} className="ml-1 rounded-lg border-l border-slate-700 p-2 hover:bg-slate-800"><Globe2 size={15} /></button>
        </div>
        {!visibleRegions.length && <p role="status" className="absolute top-6 left-6 rounded-xl border border-slate-700 bg-slate-950/90 px-5 py-3 text-sm">No hay regiones para esta búsqueda.</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3 text-[10px] text-slate-400 sm:px-7">
        <div className="flex flex-wrap items-center gap-4"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-400" />Región AWS</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-amber-400" />Región principal</span><span className="flex items-center gap-2"><i className="w-5 border-t border-dashed border-cyan-300" />Enlaces de referencia</span></div>
        <span>Ubicaciones regionales aproximadas · {visibleRegions.length} regiones visibles</span>
      </div>
    </div>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="panel flex flex-col" aria-label="Detalle de región" aria-live="polite">
        <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-medium text-slate-500"><MapPin size={15} /> Región seleccionada</span>{isPrimary && <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">Principal</span>}</div>
        <div className="mt-5 flex items-center gap-3"><span className="rounded-xl bg-slate-100 p-3 text-xl dark:bg-slate-800" aria-hidden="true">{region.flag}</span><div><h3 className="text-xl font-bold">{region.name}</h3><p className="mt-1 font-mono text-xs text-blue-600 dark:text-blue-400">{region.code}</p></div></div>
        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
          <div><dt className="text-xs text-slate-500">Ubicación</dt><dd className="mt-1 font-medium">{region.location}</dd></div>
          <div><dt className="text-xs text-slate-500">Zonas de disponibilidad</dt><dd className="mt-1 font-medium">{region.availabilityZones} AZs</dd></div>
          <div><dt className="text-xs text-slate-500">Acceso en AWS</dt><dd className="mt-1 font-medium">{region.optIn ? 'Requiere activación' : 'Habilitada por defecto'}</dd></div>
          <div><dt className="text-xs text-slate-500">Latencia estimada</dt><dd className="mt-1 font-medium">{region.latencyMs === null ? 'Sin estimación' : `${region.latencyMs} ms`}</dd></div>
        </dl>
        {region.code === 'us-west-1' && <p className="mt-4 text-xs text-amber-700 dark:text-amber-300">Las cuentas nuevas pueden acceder a dos AZs en esta región.</p>}
        <div className="my-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50"><h4 className="text-xs font-semibold">Servicios planificados</h4><p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{isPrimary ? plannedServices.join(' · ') || 'Sin servicios añadidos' : `La planificación actual usa ${activeRegion?.name ?? selectedRegion}.`}</p></div>
        <button type="button" disabled={isPrimary} onClick={() => onSelectRegion(region.code)} className="primary-button mt-auto w-full justify-center"><Check size={16} />{isPrimary ? 'Región principal' : 'Usar esta región'}</button>
      </section>

      <section className="panel" aria-label="Zonas de disponibilidad de la región">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-violet-600 dark:text-violet-400">DENTRO DE LA REGIÓN</p><h3 className="mt-1 text-lg font-bold">Zonas de disponibilidad</h3></div><Layers size={21} className="text-violet-500" /></div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">Cada AZ es una ubicación aislada. Las zonas se conectan mediante enlaces de baja latencia.</p>
        <div className="mt-6 rounded-2xl border border-dashed border-violet-300 bg-violet-50/30 p-4 dark:border-violet-800 dark:bg-violet-950/10">
          <div className="mb-4 flex items-center justify-between text-xs"><span className="font-mono text-violet-700 dark:text-violet-300">{region.code}</span><span className="text-slate-500">{region.availabilityZones} zonas</span></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {region.azIds.map((id, index) => <div key={id} className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-900 dark:bg-slate-900"><div className="mb-3 flex gap-1" aria-hidden="true">{[0, 1, 2].map(building => <span key={building} className="flex h-7 w-5 flex-col justify-center gap-1 rounded border border-violet-200 bg-violet-50 p-1 dark:border-violet-800 dark:bg-violet-950"><i className="border-t border-violet-400" /><i className="border-t border-violet-400" /></span>)}</div><p className="text-xs font-semibold">Zona {index + 1}</p><p className="mt-1 break-all font-mono text-[10px] text-violet-600 dark:text-violet-300">{id}</p></div>)}
          </div>
          <div className="relative my-4 h-px overflow-hidden bg-violet-200 dark:bg-violet-900" aria-hidden="true"><span className="az-link-flow absolute h-full w-1/3 bg-violet-500" /></div>
          <p className="text-center text-[10px] text-slate-500">Conectividad entre zonas · Diseño Multi-AZ</p>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">AZ IDs publicados por AWS. Las zonas habilitadas pueden variar según la cuenta.</p>
        <a href={AWS_AZ_SOURCE} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">Consultar zonas en AWS <ArrowUpRight size={14} /></a>
      </section>
    </div>

    <section className="panel" aria-label="Catálogo de regiones">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Regiones disponibles</h3><p className="mt-1 text-xs text-slate-500">{visibleRegions.length} regiones · {area === 'Todas' ? 'Todas las áreas' : area}</p></div><a href={AWS_REGION_SOURCE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">Catálogo AWS <ArrowUpRight size={14} /></a></div>
      <div className="grid max-h-[380px] grid-cols-1 gap-3 overflow-y-auto p-1 sm:grid-cols-2 xl:grid-cols-3">
        {visibleRegions.map(item => <button type="button" key={item.code} onClick={() => setInspectedCode(item.code)} aria-pressed={region.code === item.code} aria-label={`Consultar ${item.name}`} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${region.code === item.code ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 hover:border-blue-300 dark:border-slate-800 dark:hover:border-blue-700'}`}><span aria-hidden="true" className="text-xl">{item.flag}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{item.name}</span><span className="mt-1 block font-mono text-[10px] text-slate-500">{item.code}</span></span><span className="shrink-0 text-[10px] font-semibold text-violet-600 dark:text-violet-400">{item.availabilityZones} AZ</span></button>)}
      </div>
      {!visibleRegions.length && <p className="py-5 text-center text-sm text-slate-500">Prueba otra ciudad, país o código de región.</p>}
      <p className="mt-5 border-t border-slate-100 pt-4 text-[11px] text-slate-500 dark:border-slate-800">Catálogo comercial de AWS · China, GovCloud y European Sovereign Cloud usan particiones independientes.</p>
    </section>
  </section>;
}
