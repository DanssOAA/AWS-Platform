import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RegionExplorer } from '../src/components/RegionExplorer';
import { GLOBAL_REGIONS } from '../src/data/awsRegions';
import { connectionPath, filterRegions, projectRegion } from '../src/lib/regionMap';

afterEach(cleanup);
const region = (code: string) => GLOBAL_REGIONS.find(item => item.code === code)!;
function setup(selectedRegion = 'us-east-1') {
  const props = { selectedRegion, onSelectRegion: vi.fn(), onClear: vi.fn(), onReset: vi.fn(), plannedServices: ['Amazon EC2', 'Amazon RDS'] };
  return { ...render(<RegionExplorer {...props} />), props };
}

describe('AWS geography and zone data', () => {
  it('includes the standard AWS catalog without duplicate regions or AZ IDs', () => {
    expect(GLOBAL_REGIONS).toHaveLength(34);
    expect(new Set(GLOBAL_REGIONS.map(item => item.code)).size).toBe(34);
    const ids = GLOBAL_REGIONS.flatMap(item => item.azIds);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of GLOBAL_REGIONS) {
      expect(item.azIds).toHaveLength(item.availabilityZones);
      expect(item.latitude).toBeGreaterThanOrEqual(-90);
      expect(item.latitude).toBeLessThanOrEqual(90);
      expect(item.longitude).toBeGreaterThanOrEqual(-180);
      expect(item.longitude).toBeLessThanOrEqual(180);
    }
  });
  it('keeps documented non-sequential AZ IDs instead of inventing a/b/c names', () => {
    expect(region('ca-central-1').azIds).toEqual(['cac1-az1', 'cac1-az2', 'cac1-az4']);
    expect(region('us-east-1').azIds).toHaveLength(6);
    expect(region('ap-northeast-1').azIds).toHaveLength(4);
    expect(region('mx-central-1').optIn).toBe(true);
    expect(region('ap-southeast-6').latencyMs).toBeNull();
  });
  it('uses geographic projection consistently for map points and connection endpoints', () => {
    expect(projectRegion({ latitude: 0, longitude: 0 })).toEqual({ x: 600, y: 300 });
    const point = projectRegion(region('sa-east-1'));
    expect(point.x).toBeLessThan(600);
    expect(point.y).toBeGreaterThan(300);
    expect(connectionPath(region('sa-east-1'), region('eu-central-1'))).toContain(`M ${point.x} ${point.y} Q`);
  });
  it('takes a short route across the Pacific rather than spanning the entire map', () => {
    const start = projectRegion(region('us-west-2'));
    const path = connectionPath(region('us-west-2'), region('ap-northeast-1'));
    const endpointX = Number(path.split(' ').at(-2));
    expect(Math.abs(endpointX - start.x)).toBeLessThan(600);
  });
  it('supports country/code search without accents and area filters', () => {
    expect(filterRegions(GLOBAL_REGIONS, 'Todas', 'mexico').map(item => item.code)).toEqual(['mx-central-1']);
    expect(filterRegions(GLOBAL_REGIONS, 'Europa', 'us-east')).toEqual([]);
    expect(filterRegions(GLOBAL_REGIONS, 'Todas', 'sao')).toHaveLength(1);
  });
});

describe('Region explorer interactions', () => {
  it('shows all regions and the primary region zone details', () => {
    setup();
    expect(screen.getAllByRole('button', { name: /^Ver .*zonas$/ })).toHaveLength(34);
    const zones = screen.getByRole('region', { name: 'Zonas de disponibilidad de la región' });
    expect(within(zones).getByText('use1-az6')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Región principal' })).toHaveProperty('disabled', true);
  });
  it('explores a region before committing it as the planning region', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar México central' }));
    expect(screen.getByText('mxc1-az3')).toBeTruthy();
    expect(screen.getByText('Sin estimación')).toBeTruthy();
    expect(props.onSelectRegion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Usar esta región' }));
    expect(props.onSelectRegion).toHaveBeenCalledWith('mx-central-1');
  });
  it('selects a map marker and exposes the same details as the catalog', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Tokio (ap-northeast-1), 4 zonas' }));
    expect(screen.getByText('apne1-az4')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Consultar Tokio' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('filters map and catalog together and can restore the global view', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Europa', exact: true }));
    expect(screen.getAllByRole('button', { name: /^Ver .*zonas$/ })).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Ampliar mapa' })).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar región' }), { target: { value: 'zurich' } });
    expect(screen.getAllByRole('button', { name: /^Ver .*zonas$/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer vista global' }));
    expect(screen.getAllByRole('button', { name: /^Ver .*zonas$/ })).toHaveLength(34);
    expect(screen.getByRole('button', { name: 'Alejar mapa' })).toHaveProperty('disabled', true);
  });
  it('pauses motion and toggles dashed connections independently', () => {
    const { container } = setup();
    expect(container.querySelector('path.region-map-flow')?.getAttribute('stroke-dasharray')).toBe('5 9');
    fireEvent.click(screen.getByRole('button', { name: 'Pausar movimiento' }));
    expect(screen.getByRole('region', { name: 'Explorador de regiones AWS' }).getAttribute('data-motion')).toBe('paused');
    fireEvent.click(screen.getByRole('button', { name: 'Enlaces', exact: true }));
    expect(container.querySelector('path.region-map-flow')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reanudar movimiento' }));
    expect(screen.getByRole('region', { name: 'Explorador de regiones AWS' }).getAttribute('data-motion')).toBe('running');
  });
  it('preserves clear/reset callbacks and synchronizes external region changes', () => {
    const { props, rerender } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar', exact: true }));
    expect(props.onClear).toHaveBeenCalledOnce(); expect(props.onReset).toHaveBeenCalledOnce();
    rerender(<RegionExplorer {...props} selectedRegion="ap-southeast-6" />);
    expect(screen.getByText('apse6-az3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Región principal' })).toHaveProperty('disabled', true);
  });
  it('shows a recoverable empty result for searches with no regions', () => {
    setup();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar región' }), { target: { value: 'unknown-region' } });
    expect(screen.getByRole('status').textContent).toContain('No hay regiones');
    expect(screen.queryAllByRole('button', { name: /^Ver .*zonas$/ })).toHaveLength(0);
  });
});
