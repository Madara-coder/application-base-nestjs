import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

/**
 * Equivalent of Modules/Core/app/Policies/BasePolicy.php's hasPermission()
 * check, applied as a guard instead of a per-model Policy class + Laravel
 * Gate. Reads the permissions JwtAuthGuard attached to `request.user`
 * (e.g. from a JWT `permissions` claim) and checks them against whatever
 * `@Permissions(...)` declares on the route/controller.
 *
 * Register it globally (APP_GUARD) after JwtAuthGuard: routes without
 * @Permissions() pass straight through, so it only bites where declared.
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

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const userPermissions = request.user?.permissions ?? [];

    const hasAll = required.every((permission) => userPermissions.includes(permission));
    if (!hasAll) {
      throw new ForbiddenException(`Missing required permission: ${required.join(', ')}`);
    }

    return true;
  }
}
