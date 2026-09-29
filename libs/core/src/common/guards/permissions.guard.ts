import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';

/**
 * Equivalent of Modules/Core/app/Policies/BasePolicy.php's hasPermission()
 * check, applied as a guard instead of a per-model Policy class + Laravel
 * Gate. Reads permissions your auth strategy attached to `request.user`
 * (e.g. from a JWT `permissions` claim) and checks them against whatever
 * `@Permissions(...)` declares on the route/controller.
 *
 * Apply per-controller (`@UseGuards(PermissionsGuard)` alongside your auth
 * guard) rather than globally, since not every route needs a permission
 * check (e.g. public endpoints).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userPermissions: string[] = request.user?.permissions ?? [];

    const hasAll = required.every((permission) => userPermissions.includes(permission));
    if (!hasAll) {
      throw new ForbiddenException(`Missing required permission: ${required.join(', ')}`);
    }

    return true;
  }
}
