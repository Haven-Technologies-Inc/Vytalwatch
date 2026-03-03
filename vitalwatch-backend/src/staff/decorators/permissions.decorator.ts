import { SetMetadata } from '@nestjs/common';
import { PermissionType } from '../constants/permissions.constant';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: PermissionType[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const PERMISSIONS_MODE_KEY = 'permissions_mode';
export type PermissionMode = 'all' | 'any';
export const PermissionsMode = (mode: PermissionMode) => SetMetadata(PERMISSIONS_MODE_KEY, mode);

export const RequireAnyPermission = (...permissions: PermissionType[]) => {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, key, descriptor);
    SetMetadata(PERMISSIONS_MODE_KEY, 'any')(target, key, descriptor);
  };
};

export const RequireAllPermissions = (...permissions: PermissionType[]) => {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, key, descriptor);
    SetMetadata(PERMISSIONS_MODE_KEY, 'all')(target, key, descriptor);
  };
};
