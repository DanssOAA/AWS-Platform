import type { GlobalRegion } from '../types/cloud';

export const AWS_REGION_SOURCE = 'https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html';
export const AWS_AZ_SOURCE = 'https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-availability-zones.html';
export const REGION_AREAS = ['América del Norte', 'América del Sur', 'Europa', 'Asia Pacífico', 'Oriente Medio', 'África'] as const;
export type RegionArea = typeof REGION_AREAS[number];

// Commercial AWS partition, checked 2026-10-05. Coordinates locate the regional
// geography approximately; AWS does not publish the locations of individual AZs.
// AZ IDs come from the detailed AZ table, including London's fourth listed AZ.
type RegionSeed = [code: string, name: string, location: string, country: string, area: RegionArea,
  latitude: number, longitude: number, azPrefix: string, azNumbers: number[], optIn: boolean];
const regions: RegionSeed[] = [
  ['us-east-1', 'Virginia del Norte', 'Estados Unidos · Virginia', 'US', 'América del Norte', 38.9, -77.5, 'use1', [1, 2, 3, 4, 5, 6], false],
  ['us-east-2', 'Ohio', 'Estados Unidos · Ohio', 'US', 'América del Norte', 40.0, -83.0, 'use2', [1, 2, 3], false],
  ['us-west-1', 'Norte de California', 'Estados Unidos · California', 'US', 'América del Norte', 37.4, -121.9, 'usw1', [1, 2, 3], false],
  ['us-west-2', 'Oregón', 'Estados Unidos · Oregón', 'US', 'América del Norte', 45.8, -119.7, 'usw2', [1, 2, 3, 4], false],
  ['ca-central-1', 'Canadá central', 'Canadá · Quebec', 'CA', 'América del Norte', 45.5, -73.6, 'cac1', [1, 2, 4], false],
  ['ca-west-1', 'Calgary', 'Canadá · Alberta', 'CA', 'América del Norte', 51.0, -114.1, 'caw1', [1, 2, 3], true],
  ['mx-central-1', 'México central', 'México · Querétaro', 'MX', 'América del Norte', 20.6, -100.4, 'mxc1', [1, 2, 3], true],
  ['sa-east-1', 'São Paulo', 'Brasil · São Paulo', 'BR', 'América del Sur', -23.6, -46.6, 'sae1', [1, 2, 3], false],
  ['eu-west-1', 'Irlanda', 'Irlanda · Dublín', 'IE', 'Europa', 53.3, -6.3, 'euw1', [1, 2, 3], false],
  ['eu-west-2', 'Londres', 'Reino Unido · Londres', 'GB', 'Europa', 51.5, -0.1, 'euw2', [1, 2, 3, 4], false],
  ['eu-west-3', 'París', 'Francia · París', 'FR', 'Europa', 48.9, 2.4, 'euw3', [1, 2, 3], false],
  ['eu-central-1', 'Fráncfort', 'Alemania · Fráncfort', 'DE', 'Europa', 50.1, 8.7, 'euc1', [1, 2, 3], false],
  ['eu-central-2', 'Zúrich', 'Suiza · Zúrich', 'CH', 'Europa', 47.4, 8.5, 'euc2', [1, 2, 3], true],
  ['eu-south-1', 'Milán', 'Italia · Milán', 'IT', 'Europa', 45.5, 9.2, 'eus1', [1, 2, 3], true],
  ['eu-south-2', 'España', 'España · Aragón', 'ES', 'Europa', 41.6, -0.9, 'eus2', [1, 2, 3], true],
  ['eu-north-1', 'Estocolmo', 'Suecia · Estocolmo', 'SE', 'Europa', 59.3, 18.1, 'eun1', [1, 2, 3], false],
  ['af-south-1', 'Ciudad del Cabo', 'Sudáfrica · Ciudad del Cabo', 'ZA', 'África', -33.9, 18.4, 'afs1', [1, 2, 3], true],
  ['il-central-1', 'Tel Aviv', 'Israel · Tel Aviv', 'IL', 'Oriente Medio', 32.1, 34.8, 'ilc1', [1, 2, 3], true],
  ['me-south-1', 'Baréin', 'Baréin', 'BH', 'Oriente Medio', 26.1, 50.5, 'mes1', [1, 2, 3], true],
  ['me-central-1', 'Emiratos Árabes Unidos', 'Emiratos Árabes Unidos', 'AE', 'Oriente Medio', 24.5, 54.4, 'mec1', [1, 2, 3], true],
  ['ap-south-1', 'Mumbai', 'India · Maharashtra', 'IN', 'Asia Pacífico', 19.1, 72.9, 'aps1', [1, 2, 3], false],
  ['ap-south-2', 'Hyderabad', 'India · Telangana', 'IN', 'Asia Pacífico', 17.4, 78.5, 'aps2', [1, 2, 3], true],
  ['ap-east-1', 'Hong Kong', 'Hong Kong', 'HK', 'Asia Pacífico', 22.3, 114.2, 'ape1', [1, 2, 3], true],
  ['ap-east-2', 'Taipéi', 'Taiwán · Taipéi', 'TW', 'Asia Pacífico', 25.0, 121.6, 'ape2', [1, 2, 3], true],
  ['ap-northeast-1', 'Tokio', 'Japón · Tokio', 'JP', 'Asia Pacífico', 35.7, 139.7, 'apne1', [1, 2, 3, 4], false],
  ['ap-northeast-2', 'Seúl', 'Corea del Sur · Seúl', 'KR', 'Asia Pacífico', 37.6, 127.0, 'apne2', [1, 2, 3, 4], false],
  ['ap-northeast-3', 'Osaka', 'Japón · Osaka', 'JP', 'Asia Pacífico', 34.7, 135.5, 'apne3', [1, 2, 3], false],
  ['ap-southeast-1', 'Singapur', 'Singapur', 'SG', 'Asia Pacífico', 1.4, 103.8, 'apse1', [1, 2, 3], false],
  ['ap-southeast-2', 'Sídney', 'Australia · Nueva Gales del Sur', 'AU', 'Asia Pacífico', -33.9, 151.2, 'apse2', [1, 2, 3], false],
  ['ap-southeast-3', 'Yakarta', 'Indonesia · Java', 'ID', 'Asia Pacífico', -6.2, 106.8, 'apse3', [1, 2, 3], true],
  ['ap-southeast-4', 'Melbourne', 'Australia · Victoria', 'AU', 'Asia Pacífico', -37.8, 145.0, 'apse4', [1, 2, 3], true],
  ['ap-southeast-5', 'Malasia', 'Malasia', 'MY', 'Asia Pacífico', 3.1, 101.7, 'apse5', [1, 2, 3], true],
  ['ap-southeast-6', 'Nueva Zelanda', 'Nueva Zelanda · Auckland', 'NZ', 'Asia Pacífico', -36.8, 174.8, 'apse6', [1, 2, 3], true],
  ['ap-southeast-7', 'Tailandia', 'Tailandia · Bangkok', 'TH', 'Asia Pacífico', 13.8, 100.5, 'apse7', [1, 2, 3], true],
];

// Preserve the existing planning estimates. New regions have no latency estimate.
const latencyEstimates: Record<string, number> = {
  'us-east-1': 12, 'us-west-2': 35, 'eu-west-1': 105, 'eu-central-1': 118,
  'sa-east-1': 28, 'ap-northeast-1': 210, 'ap-south-1': 245, 'ap-southeast-1': 260,
};

export const GLOBAL_REGIONS: GlobalRegion[] = regions.map(([code, name, location, country, area, latitude, longitude, prefix, numbers, optIn]) => ({
  id: code, code, name, location, country, area, latitude, longitude, optIn,
  flag: [...country].map(char => String.fromCodePoint(127397 + char.charCodeAt(0))).join(''),
  azIds: numbers.map(number => `${prefix}-az${number}`),
  availabilityZones: numbers.length,
  latencyMs: latencyEstimates[code] ?? null,
  status: 'Operativo', deployedServices: [],
}));
