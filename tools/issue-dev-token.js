#!/usr/bin/env node
/**
 * Mints an HS256 access token for local development, signed with JWT_SECRET
 * from .env, so the protected API can be called before a real identity
 * provider / login module exists. Refuses to run with NODE_ENV=production.
 *
 * Usage:
 *   npm run token -- brand.read brand.create           # permissions
 *   npm run token -- brand.read --sub user-42 --ttl 2h
 *
 * Then: curl -H "Authorization: Bearer <token>" localhost:3000/v1/brands
 * or paste it into "Authorize" at http://localhost:3000/docs.
 */
import 'dotenv/config';
import crypto from 'node:crypto';

const args = process.argv.slice(2);

function flag(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const [value] = args.splice(index, 2).slice(1);
  return value;
}

function parseTtl(ttl) {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) throw new Error(`Invalid --ttl "${ttl}" (use e.g. 30m, 12h, 7d)`);
  return Number(match[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
}

function base64url(value) {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
}

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to mint a development token with NODE_ENV=production.');
  process.exit(1);
}

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('JWT_SECRET is not set - copy .env.example to .env first.');
  process.exit(1);
}

const sub = flag('sub', 'dev-user');
const ttlSeconds = parseTtl(flag('ttl', '12h'));
const permissions = args.filter((arg) => !arg.startsWith('--'));

const now = Math.floor(Date.now() / 1000);
const payload = { sub, permissions, iat: now, exp: now + ttlSeconds };
if (process.env.JWT_ISSUER) payload.iss = process.env.JWT_ISSUER;
if (process.env.JWT_AUDIENCE) payload.aud = process.env.JWT_AUDIENCE;

const unsigned = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}`;
const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');

console.log(`${unsigned}.${signature}`);
