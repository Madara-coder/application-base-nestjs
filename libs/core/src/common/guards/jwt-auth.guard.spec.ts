import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { Public } from '../decorators/public.decorator.js';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

@Public()
class PublicController {
  handler() {}
}

class PrivateController {
  handler() {}
}

describe('JwtAuthGuard', () => {
  const jwtService = new JwtService({ secret: 'test-secret-test-secret-test-secret' });
  const guard = new JwtAuthGuard(jwtService, new Reflector());

  const contextFor = (controller: new () => { handler(): void }, authorization?: string) => {
    const request: { headers: Record<string, string | undefined>; user?: AuthUser } = { headers: { authorization } };
    const context = {
      getClass: () => controller,
      getHandler: () => controller.prototype.handler,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  it('lets @Public() routes through without a token', async () => {
    await expect(guard.canActivate(contextFor(PublicController).context)).resolves.toBe(true);
  });

  it('attaches the verified claims to request.user', async () => {
    const token = await jwtService.signAsync({ sub: 'user-1', permissions: ['brand.read'] });
    const { context, request } = contextFor(PrivateController, `Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ id: 'user-1', sub: 'user-1', permissions: ['brand.read'] });
  });

  it('defaults permissions to [] when the claim is missing', async () => {
    const token = await jwtService.signAsync({ sub: 'user-1' });
    const { context, request } = contextFor(PrivateController, `Bearer ${token}`);

    await guard.canActivate(context);
    expect(request.user?.permissions).toEqual([]);
  });

  it.each([
    ['no header', undefined],
    ['a non-bearer scheme', 'Basic abc'],
    ['a malformed token', 'Bearer not-a-jwt'],
  ])('rejects %s with 401', async (_label, header) => {
    await expect(guard.canActivate(contextFor(PrivateController, header).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = await new JwtService({ secret: 'some-other-secret-some-other-secret' }).signAsync({ sub: 'x' });
    await expect(guard.canActivate(contextFor(PrivateController, `Bearer ${forged}`).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
