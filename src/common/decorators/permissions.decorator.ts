import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * `@Permissions('brand.update')` - checked by PermissionsGuard against
 * `request.user.permissions`. Equivalent of BasePolicy's convention-based
 * "{policyKey}.{action}" Spatie permission check, but explicit per-route
 * instead of magic __call() method-name mapping, since Nest routes aren't
 * named after policy verbs the way Laravel's authorize('update', $model) is.
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Builds the conventional CRUD permission set for a resource, e.g.
 * permissionsFor('brand') -> { create: 'brand.create', read: 'brand.read', ... }
 */
export function permissionsFor(resource: string) {
  return {
    create: `${resource}.create`,
    read: `${resource}.read`,
    update: `${resource}.update`,
    delete: `${resource}.delete`,
  };
}
