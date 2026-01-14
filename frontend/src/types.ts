export type Role = 'ADMIN' | 'IT_STAFF';

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
};

export type ModuleStatus = 'enabled' | 'disabled';

export type ModuleInfo = {
  id: string;
  name: string;
  description?: string;
  route: string;
  status: ModuleStatus;
};

export type Device = {
  id: number;
  name: string;
  code: string;
  category?: string;
  status: 'available' | 'assigned' | 'maintenance' | 'repair' | 'in_transit' | 'retired';
  lifecycleStatus?: 'normal' | 'maintenance' | 'repair' | 'in_transit' | 'retired';
  purchaseDate: string;
  warrantyMonths: number;
  warrantyEndDate?: string | null;
  lastMaintenanceDate?: string | null;
  maintenanceIntervalDays?: number;
  maintenanceDue?: boolean;
  notes?: string;
  statusReason?: string | null; // legacy
  lifecycleReason?: string | null;
};

export type DeviceAssignment = {
  employeeName: string;
  employeeCode: string;
  employeeEmail: string;
  department: string;
  occurredAt: string;
  notes?: string | null;
};

export type DevicePublicInfo = Device & {
  assignment?: DeviceAssignment | null;
};

export type Assignment = {
  id: number;
  action: 'issue' | 'return';
  status: 'PENDING_CONFIRM' | 'CONFIRMED' | 'RETURNED' | 'CANCELLED' | 'FAILED';
  employeeName: string;
  employeeCode: string;
  employeeEmail: string;
  department: string;
  device: Device;
  occurredAt: string;
  notes?: string;
  returnReason?: string;
  documentUrl?: string | null;
  documentName?: string | null;
  documentGeneratedAt?: string | null;
  confirmToken?: string | null;
  confirmTokenExpiresAt?: string | null;
  confirmedAt?: string | null;
  confirmedIp?: string | null;
  confirmedUserAgent?: string | null;
  user?: User;
};

export type ActiveAssignee = {
  employeeName: string;
  employeeCode: string;
  employeeEmail: string;
  department: string;
  devices: Pick<Device, 'id' | 'name' | 'code' | 'status'>[];
};

export type AlertSummary = {
  total: number;
  warranty: Device[];
  maintenance: Device[];
};

export type Stats = {
  total: number;
  assigned: number;
  available: number;
};
