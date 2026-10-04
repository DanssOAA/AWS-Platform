export type ServiceStatus = 'In Use' | 'Available' | 'Configured' | 'Pending';
export type SecurityStatusLevel = 'green' | 'yellow' | 'red';
export type ServiceCategory = 'Computación' | 'Almacenamiento' | 'Base de Datos' | 'Seguridad & IAM' | 'Redes & CDN' | 'Analítica';

export interface AWSService {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  mainFunction: string;
  status: ServiceStatus;
  hourlyCost: number;
  iconName: string;
  details: {
    tier: string;
    sla: string;
    pricingModel: string;
    useCases: string[];
    keyFeatures: string[];
  };
}

export interface CloudProposal {
  id: string;
  solutionName: string;
  appType: string;
  description: string;
  selectedRegion: string;
  estimatedUsers: number;
  availabilityLevel: string;
  selectedServices: string[];
  migrationGoal: string;
  createdAt: string;
}

export interface CostEstimate {
  id: string;
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  quantity: number;
  hoursPerMonth: number;
  hourlyCost: number;
  monthlyCost: number;
  annualCost: number;
}

export interface GlobalRegion {
  id: string;
  code: string;
  name: string;
  location: string;
  flag: string;
  latencyMs: number;
  status: 'Operativo' | 'Degradado' | 'Mantenimiento';
  deployedServices: string[];
  availabilityZones: number;
}

export interface SecurityCheck {
  id: string;
  title: string;
  category: 'Modelo Responsabilidad' | 'IAM' | 'Protección Cuentas' | 'Protección Datos' | 'Cumplimiento';
  responsibleParty: 'AWS' | 'Cliente' | 'Compartido';
  status: SecurityStatusLevel;
  description: string;
  recommendation: string;
}

export interface IAMUser {
  id: string;
  username: string;
  role: string;
  mfaEnabled: boolean;
  accessKeyActive: boolean;
  lastLogin: string;
  policiesAttached: string[];
  status: 'Activo' | 'Inactivo' | 'Bloqueado';
}

export interface NetworkComponent {
  id: string;
  name: string;
  type: 'INTERNET' | 'Route 53' | 'CloudFront' | 'WAF' | 'VPC' | 'ALB' | 'Subnet Pública' | 'Subnet Privada' | 'EC2' | 'RDS';
  description: string;
  ipRange?: string;
  status: 'Operativo' | 'En Espera' | 'Protegido';
  connectedTo: string[];
}

export interface NotificationToast {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
}
