import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { AuthUser, JwtPayload } from '../interfaces/auth-user.interface.js';

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the
 * claims to `request.user` as an AuthUser, which PermissionsGuard and
 * @CurrentUser() then read. Register it globally (APP_GUARD) so routes are
 * protected by default, and opt out with @Public().
 *
 * Needs JwtService - register `JwtModule.registerAsync({ global: true, ... })`
 * in the app with the secret/algorithm used by whoever issues the tokens.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined>; user?: AuthUser }>();
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException('Missing bearer token.');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    request.user = { ...payload, id: payload.sub, permissions: payload.permissions ?? [] };
    return true;
  }

  private extractBearerToken(header?: string): string | undefined {
    const [type, token] = header?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : undefined;
  }
}
