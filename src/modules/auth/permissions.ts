export interface PermissionUser {
  role?: string | null;
  permissions?: string[];
  userRole?: { permissions?: string[] } | null;
}

export function getUserEffectivePermissions(user?: PermissionUser | null): string[] {
  if (!user) return [];
  if (user.permissions?.length) return user.permissions;

  const role = (user.role || '').trim().toLowerCase();
  if (role === 'admin' || role === 'super admin') return ['*'];

  const rolePermissions = user.userRole?.permissions ?? [];
  if (rolePermissions.includes('*') || rolePermissions.includes('all') || rolePermissions.includes('manage:all')) {
    return ['*'];
  }
  if (rolePermissions.length) return rolePermissions;

  // The standalone repo's seeded executive role predates feature-level permissions.
  if (role === 'executive') return ['*'];
  return ['dashboard'];
}

export function hasFeatureAccess(user: PermissionUser | null | undefined, feature: string): boolean {
  const permissions = user?.permissions ?? getUserEffectivePermissions(user);
  return permissions.includes('*') || permissions.includes('all') || permissions.includes(feature);
}

export function isManagerRole(role?: string | null): boolean {
  const normalized = (role || '').trim().toLowerCase();
  return normalized === 'manager' || normalized === 'branch manager';
}

export function isAdminRole(role?: string | null): boolean {
  const normalized = (role || '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'super admin';
}
