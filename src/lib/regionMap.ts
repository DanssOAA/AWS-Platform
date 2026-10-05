import type { GlobalRegion } from '../types/cloud';

export function projectRegion(region: Pick<GlobalRegion, 'latitude' | 'longitude'>) {
  return { x: (region.longitude + 180) / 360 * 1200, y: (90 - region.latitude) / 180 * 600 };
}

export function connectionPath(from: GlobalRegion, to: GlobalRegion) {
  const start = projectRegion(from);
  const end = projectRegion(to);
  // Use the short route across the dateline, with wrapped copies drawn in the SVG.
  if (end.x - start.x > 600) end.x -= 1200;
  if (start.x - end.x > 600) end.x += 1200;
  const lift = Math.min(110, Math.hypot(end.x - start.x, end.y - start.y) * 0.24);
  return `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${Math.max(8, (start.y + end.y) / 2 - lift)} ${end.x} ${end.y}`;
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function filterRegions(regions: GlobalRegion[], area: string, query: string) {
  const term = normalize(query.trim());
  return regions.filter(region => (area === 'Todas' || region.area === area)
    && normalize(`${region.name} ${region.code} ${region.location}`).includes(term));
}
