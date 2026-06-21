export interface CustomRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface CustomPermission {
  id: string;
  name: string;
  description: string;
}

export interface CustomUser {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  dni: string;
  role: string;
  birth_date?: string;
  created_at: string;
}

export const DEFAULT_PERMISSIONS: CustomPermission[] = [
  { id: 'ver_admin', name: 'Acceder a Panel Admin', description: 'Permite ingresar al menú de administración principal' },
  { id: 'cargar_puntos', name: 'Cargar Puntos', description: 'Habilidad de cargar puntos a clientes (Vista Mozo)' },
  { id: 'canjear_premios', name: 'Canjear Premios', description: 'Capacidad de aprobar canjes de premios' },
  { id: 'editar_diseno', name: 'Modificar Diseño', description: 'Acceso a cambiar colores, logos, órdenes de botones' },
  { id: 'editar_config', name: 'Ajustes del Sistema', description: 'Editar niveles, sucursales y montos' },
  { id: 'gestionar_usuarios', name: 'Usuarios & Permisos', description: 'Administrar cuentas, roles y sus permisos' }
];

export const DEFAULT_ROLES: CustomRole[] = [
  {
    id: 'admin',
    name: 'ADMINISTRADOR',
    permissions: ['ver_admin', 'cargar_puntos', 'canjear_premios', 'editar_diseno', 'editar_config', 'gestionar_usuarios']
  },
  {
    id: 'waiter',
    name: 'STAFF / MOZO',
    permissions: ['cargar_puntos', 'canjear_premios']
  },
  {
    id: 'client',
    name: 'CLIENTE',
    permissions: []
  }
];

export function getRoles(): CustomRole[] {
  const saved = localStorage.getItem('clubcraft_roles');
  if (!saved) {
    localStorage.setItem('clubcraft_roles', JSON.stringify(DEFAULT_ROLES));
    return DEFAULT_ROLES;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    return DEFAULT_ROLES;
  }
}

export function saveRoles(roles: CustomRole[]) {
  localStorage.setItem('clubcraft_roles', JSON.stringify(roles));
}

export function getPermissions(): CustomPermission[] {
  const saved = localStorage.getItem('clubcraft_permissions');
  if (!saved) {
    localStorage.setItem('clubcraft_permissions', JSON.stringify(DEFAULT_PERMISSIONS));
    return DEFAULT_PERMISSIONS;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    return DEFAULT_PERMISSIONS;
  }
}

export function savePermissions(perms: CustomPermission[]) {
  localStorage.setItem('clubcraft_permissions', JSON.stringify(perms));
}

export function getCustomUsers(): CustomUser[] {
  const saved = localStorage.getItem('clubcraft_custom_users');
  if (!saved) {
    return [];
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    return [];
  }
}

export function saveCustomUsers(users: CustomUser[]) {
  localStorage.setItem('clubcraft_custom_users', JSON.stringify(users));
}

export function hasPermission(role: string | undefined, permissionId: string): boolean {
  if (!role) return false;
  
  // Hardcoded emergency privilege for administrator email
  if (role === 'admin') return true;

  const roles = getRoles();
  const matchedRole = roles.find(r => r.id === role);
  if (!matchedRole) return false;

  return matchedRole.permissions.includes(permissionId);
}
