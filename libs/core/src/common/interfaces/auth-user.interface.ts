/**
 * Claims the API expects in an access token. `sub` is the user id;
 * `permissions` holds the "{resource}.{action}" strings @Permissions() checks.
 */
export interface JwtPayload {
  sub: string;
  permissions?: string[];
  [claim: string]: unknown;
}

/** What JwtAuthGuard attaches to `request.user` - read it with @CurrentUser(). */
export interface AuthUser extends JwtPayload {
  id: string;
  permissions: string[];
}
