import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';

/**
 * Boots the real AppModule (guards, pipes, filters, interceptor) against an
 * in-memory sqljs database built by the migrations - see vitest.config.e2e.ts
 * for the env. Requests authenticate with real tokens signed by the app's
 * own JwtService.
 */
describe('Brands (e2e)', () => {
  let app: INestApplication<App>;
  let fullAccess: string;

  const tokenFor = (permissions: string[]) => app.get(JwtService).signAsync({ sub: 'user-1', permissions });
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(moduleFixture.createNestApplication());
    await app.init();

    fullAccess = await tokenFor(['brand.read', 'brand.create', 'brand.update', 'brand.delete']);
  });

  afterAll(() => app.close());

  describe('auth', () => {
    it('rejects requests without a token (401)', async () => {
      const res = await api().get('/v1/brands').expect(401);
      expect(res.body).toEqual({ message: 'Missing bearer token.' });
    });

    it('rejects an invalid token (401)', async () => {
      await api().get('/v1/brands').auth('not-a-jwt', { type: 'bearer' }).expect(401);
    });

    it('rejects a token without the route permission (403)', async () => {
      const readOnly = await tokenFor(['brand.read']);
      const res = await api().post('/v1/brands').auth(readOnly, { type: 'bearer' }).send({}).expect(403);
      expect(res.body).toEqual({ message: 'Missing required permission: brand.create' });
    });
  });

  describe('CRUD', () => {
    let brandId: string;

    it('POST /v1/brands creates a brand and strips unknown fields', async () => {
      const res = await api()
        .post('/v1/brands')
        .auth(fullAccess, { type: 'bearer' })
        .send({ name: ' Matte Co ', slug: 'MATTE', sortOrder: 2, unknownField: 'stripped' })
        .expect(201);

      expect(res.body.message).toBe('Brand created successfully.');
      expect(res.body.data).toMatchObject({ name: 'Matte Co', slug: 'matte', sortOrder: 2, isActive: true });
      expect(res.body.data).not.toHaveProperty('unknownField');
      expect(res.body.data).not.toHaveProperty('deletedAt'); // BrandResource decides what's exposed
      brandId = res.body.data.id;
    });

    it('POST /v1/brands rejects an invalid body (400)', async () => {
      const res = await api().post('/v1/brands').auth(fullAccess, { type: 'bearer' }).send({ slug: 'x' }).expect(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('name')]));
    });

    it('POST /v1/brands rejects a duplicate slug (409)', async () => {
      await api()
        .post('/v1/brands')
        .auth(fullAccess, { type: 'bearer' })
        .send({ name: 'Dup', slug: 'matte' })
        .expect(409);
    });

    it('GET /v1/brands lists with search and pagination meta', async () => {
      const res = await api().get('/v1/brands?search=mat').auth(fullAccess, { type: 'bearer' }).expect(200);

      expect(res.body.message).toBe('List fetched successfully.');
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.meta).toEqual({ total: 1, perPage: 25, currentPage: 1, lastPage: 1 });
    });

    it('GET /v1/brands/:id returns one brand, and 400s on a non-uuid id', async () => {
      const res = await api().get(`/v1/brands/${brandId}`).auth(fullAccess, { type: 'bearer' }).expect(200);
      expect(res.body.data.id).toBe(brandId);

      await api().get('/v1/brands/not-a-uuid').auth(fullAccess, { type: 'bearer' }).expect(400);
    });

    it('PUT /v1/brands/:id updates a brand', async () => {
      const res = await api()
        .put(`/v1/brands/${brandId}`)
        .auth(fullAccess, { type: 'bearer' })
        .send({ sortOrder: 7 })
        .expect(200);
      expect(res.body).toMatchObject({ message: 'Brand updated successfully.', data: { sortOrder: 7 } });
    });

    it('DELETE soft deletes, then PATCH :id/restore brings it back', async () => {
      const deleted = await api().delete(`/v1/brands/${brandId}`).auth(fullAccess, { type: 'bearer' }).expect(200);
      expect(deleted.body).toEqual({ message: 'Brand deleted successfully.' });
      await api().get(`/v1/brands/${brandId}`).auth(fullAccess, { type: 'bearer' }).expect(404);

      const restored = await api()
        .patch(`/v1/brands/${brandId}/restore`)
        .auth(fullAccess, { type: 'bearer' })
        .expect(200);
      expect(restored.body).toMatchObject({ message: 'Brand restored successfully.', data: { id: brandId } });
    });
  });

  describe('platform', () => {
    it('GET /health is public and reports the database', async () => {
      const res = await api().get('/health').expect(200);
      expect(res.body.data).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } });
    });

    it('serves the OpenAPI document with the brand routes', async () => {
      const res = await api().get('/docs-json').expect(200);
      expect(Object.keys(res.body.paths)).toEqual(
        expect.arrayContaining(['/v1/brands', '/v1/brands/{id}', '/v1/brands/{id}/restore', '/health']),
      );
    });

    it('sets security headers', async () => {
      const res = await api().get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
