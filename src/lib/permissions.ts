import { supabase } from '@/src/lib/supabase';

export interface CustomRole {
  id: string;
  name: string;
  permissions: string[];
  is_system?: boolean;
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

// Catálogo de permisos: son capacidades que el CÓDIGO chequea, por eso viven acá
// (no tiene sentido hacerlos editables: un permiso solo existe si el código lo mira).
export const DEFAULT_PERMISSIONS: CustomPermission[] = [
  { id: 'ver_admin', name: 'Acceder a Panel Admin', description: 'Permite ingresar al menú de administración principal' },
  { id: 'cargar_puntos', name: 'Cargar Puntos', description: 'Habilidad de cargar puntos a clientes (Vista Cajero)' },
  { id: 'canjear_premios', name: 'Canjear Premios', description: 'Capacidad de aprobar canjes de premios' },
  { id: 'editar_diseno', name: 'Modificar Diseño', description: 'Acceso a cambiar colores, logos, órdenes de botones' },
  { id: 'editar_config', name: 'Ajustes del Sistema', description: 'Editar niveles, sucursales y montos' },
  { id: 'gestionar_usuarios', name: 'Usuarios & Permisos', description: 'Administrar cuentas, roles y sus permisos' },
  { id: 'ver_reportes', name: 'Ver Reportes', description: 'Acceso solo a Dashboard y Movimientos del panel (sin gestionar el resto)' }
];

// Roles base: sirven de RESPALDO si Supabase no responde, para que el acceso del
// admin / cajero / cliente nunca se rompa. En Supabase se guardan como is_system.
export const DEFAULT_ROLES: CustomRole[] = [
  {
    id: 'admin',
    name: 'ADMINISTRADOR',
    permissions: ['ver_admin', 'cargar_puntos', 'canjear_premios', 'editar_diseno', 'editar_config', 'gestionar_usuarios'],
    is_system: true
  },
  {
    id: 'waiter',
    name: 'CAJERO / MOZO',
    permissions: ['cargar_puntos', 'canjear_premios'],
    is_system: true
  },
  {
    id: 'client',
    name: 'CLIENTE',
    permissions: [],
    is_system: true
  }
];

// Cache en memoria de los roles. Se llena con loadRoles() al iniciar la app.
// Arranca con los roles base como respaldo.
let ROLES_CACHE: CustomRole[] = DEFAULT_ROLES.map(r => ({ ...r }));

// Carga los roles desde Supabase y actualiza el cache. Si falla, deja el respaldo.
export async function loadRoles(): Promise<CustomRole[]> {
  try {
    const { data, error } = await supabase.from('roles').select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      ROLES_CACHE = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        permissions: Array.isArray(r.permissions) ? r.permissions : [],
        is_system: !!r.is_system
      }));
    }
  } catch (e) {
    // Mantenemos DEFAULT_ROLES como respaldo (no rompemos el acceso).
  }
  return ROLES_CACHE;
}

// Devuelve los roles cargados en memoria (sincrónico, para usar en render).
export function getRolesCache(): CustomRole[] {
  return ROLES_CACHE;
}

// Alias sincrónico para compatibilidad con el código existente.
export function getRoles(): CustomRole[] {
  return ROLES_CACHE;
}

// Crea o actualiza un rol en Supabase y refresca el cache.
export async function saveRoleToSupabase(role: CustomRole): Promise<void> {
  const { error } = await supabase.from('roles').upsert({
    id: role.id,
    name: role.name,
    permissions: role.permissions,
    is_system: role.is_system ?? false
  }, { onConflict: 'id' });
  if (error) throw error;
  await loadRoles();
}

// Borra un rol de Supabase (los is_system no se borran) y refresca el cache.
export async function deleteRoleFromSupabase(roleId: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', roleId);
  if (error) throw error;
  await loadRoles();
}

// Compatibilidad: antes guardaba en localStorage. Ahora no se usa (los roles se
// guardan uno por uno en Supabase con saveRoleToSupabase). Se deja como no-op.
export function saveRoles(_roles: CustomRole[]) {
  /* obsoleto: usar saveRoleToSupabase / deleteRoleFromSupabase */
}

export function getPermissions(): CustomPermission[] {
  return DEFAULT_PERMISSIONS;
}

export function savePermissions(_perms: CustomPermission[]) {
  /* el catálogo de permisos es fijo en código */
}

// Usuarios personalizados (creados a mano por el admin): siguen en localStorage.
export function getCustomUsers(): CustomUser[] {
  const saved = localStorage.getItem('clubcraft_custom_users');
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch (e) {
    return [];
  }
}

export function saveCustomUsers(users: CustomUser[]) {
  localStorage.setItem('clubcraft_custom_users', JSON.stringify(users));
}

// Chequeo de permiso (sincrónico, lee el cache en memoria).
export function hasPermission(role: string | undefined, permissionId: string): boolean {
  if (!role) return false;

  // Privilegio de emergencia: el administrador siempre puede todo.
  if (role === 'admin') return true;

  const matchedRole = ROLES_CACHE.find(r => r.id === role);
  if (matchedRole) {
    return matchedRole.permissions.includes(permissionId);
  }

  // Respaldo: si el cache todavía no tiene el rol, probamos con los roles base.
  const fallback = DEFAULT_ROLES.find(r => r.id === role);
  return fallback ? fallback.permissions.includes(permissionId) : false;
}
