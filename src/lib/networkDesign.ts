export const BOARD = { width: 1800, height: 1200 };
export const NETWORK_PARTS = [
  { type: 'vpc', name: 'VPC', category: 'Espacios', color: '#60a5fa', width: 720, height: 580 },
  { type: 'az', name: 'Zona de disponibilidad', category: 'Espacios', color: '#c4b5fd', width: 320, height: 440 },
  { type: 'public-subnet', name: 'Subred pública', category: 'Espacios', color: '#34d399', width: 280, height: 200 },
  { type: 'private-subnet', name: 'Subred privada', category: 'Espacios', color: '#fbbf24', width: 280, height: 200 },
  { type: 'internet', name: 'Internet', category: 'Red y acceso', color: '#94a3b8' },
  { type: 'route53', name: 'Route 53', category: 'Red y acceso', color: '#a78bfa' },
  { type: 'cloudfront', name: 'CloudFront', category: 'Red y acceso', color: '#a78bfa' },
  { type: 'waf', name: 'AWS WAF', category: 'Red y acceso', color: '#fb7185' },
  { type: 'igw', name: 'Internet Gateway', category: 'Red y acceso', color: '#c4b5fd' },
  { type: 'nat', name: 'NAT Gateway', category: 'Red y acceso', color: '#c4b5fd' },
  { type: 'alb', name: 'Load Balancer', category: 'Red y acceso', color: '#a78bfa' },
  { type: 'api', name: 'API Gateway', category: 'Red y acceso', color: '#a78bfa' },
  { type: 'ec2', name: 'Amazon EC2', category: 'Cómputo', color: '#fb923c' },
  { type: 'lambda', name: 'AWS Lambda', category: 'Cómputo', color: '#fb923c' },
  { type: 'ecs', name: 'Amazon ECS', category: 'Cómputo', color: '#fb923c' },
  { type: 'rds', name: 'Amazon RDS', category: 'Datos', color: '#60a5fa' },
  { type: 'dynamodb', name: 'DynamoDB', category: 'Datos', color: '#60a5fa' },
  { type: 's3', name: 'Amazon S3', category: 'Datos', color: '#34d399' },
] as const;
export type PartType = typeof NETWORK_PARTS[number]['type'];
export type DesignNode = { id: string; type: PartType; name: string; x: number; y: number; width: number; height: number; detail: string; zone: string };
export type DesignEdge = { id: string; source: string; target: string; label: string };
export type NetworkDesign = { version: 1; nodes: DesignNode[]; edges: DesignEdge[] };
export const emptyDesign = (): NetworkDesign => ({ version: 1, nodes: [], edges: [] });
export const partFor = (type: PartType) => NETWORK_PARTS.find(part => part.type === type)!;
export const isSpace = (type: PartType) => partFor(type).category === 'Espacios';
export const snap = (value: number) => Math.round(value / 20) * 20;
export function position(node: DesignNode, x: number, y: number) {
  return { x: Math.max(0, Math.min(BOARD.width - node.width, snap(x))), y: Math.max(0, Math.min(BOARD.height - node.height, snap(y))) };
}
export function createNode(type: PartType, x: number, y: number): DesignNode {
  const part = partFor(type);
  const node = { id: crypto.randomUUID(), type, name: part.name, x, y, width: 'width' in part ? part.width : 180, height: 'height' in part ? part.height : 88, detail: '', zone: '' };
  return { ...node, ...position(node, x, y) };
}
export function connectNodes(design: NetworkDesign, source: string, target: string): NetworkDesign {
  if (source === target || !design.nodes.some(n => n.id === source) || !design.nodes.some(n => n.id === target) || design.edges.some(e => e.source === source && e.target === target)) return design;
  return { ...design, edges: [...design.edges, { id: crypto.randomUUID(), source, target, label: 'HTTPS' }] };
}
export function removeNode(design: NetworkDesign, id: string): NetworkDesign {
  return { ...design, nodes: design.nodes.filter(node => node.id !== id), edges: design.edges.filter(edge => edge.source !== id && edge.target !== id) };
}
export function parseDesign(raw: string): NetworkDesign {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Invalid draft');
  const design = value as NetworkDesign;
  if (design.version !== 1 || !Array.isArray(design.nodes) || !Array.isArray(design.edges) || design.nodes.length > 200 || design.edges.length > 1000) throw new Error('Invalid draft');
  const ids = new Set<string>();
  for (const node of design.nodes) {
    if (!node || typeof node.id !== 'string' || ids.has(node.id) || !NETWORK_PARTS.some(p => p.type === node.type) ||
      ![node.name, node.detail, node.zone].every(v => typeof v === 'string' && v.length <= 500) ||
      ![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.width < 100 || node.height < 60 ||
      node.x < 0 || node.y < 0 || node.x + node.width > BOARD.width || node.y + node.height > BOARD.height) throw new Error('Invalid draft');
    ids.add(node.id);
  }
  const edgeIds = new Set<string>();
  const pairs = new Set<string>();
  for (const edge of design.edges) {
    const pair = JSON.stringify([edge?.source, edge?.target]);
    if (!edge || typeof edge.id !== 'string' || edgeIds.has(edge.id) || pairs.has(pair) || !ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target || typeof edge.label !== 'string' || edge.label.length > 100) throw new Error('Invalid draft');
    edgeIds.add(edge.id); pairs.add(pair);
  }
  return design;
}
