import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';

/**
 * Boots the real AppModule against an in-memory sqljs database built by the
 * migrations (see vitest.config.e2e.ts). There's no auth module yet, so a
 * fake one attaches a user with every brand permission to each request.
 */
describe('Brands (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = setupApp(moduleFixture.createNestApplication());
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = {
        id: 'user-1',
        permissions: ['brand.read', 'brand.create', 'brand.update', 'brand.delete'],
      };
      next();
    });
    await app.init();
  });

  afterAll(() => app.close());

  let brandId: string;

  it('POST /v1/brands creates a brand', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/brands')
      .send({ name: ' Matte Co ', slug: 'MATTE', sortOrder: 2, unknownField: 'stripped' })
      .expect(201);

    expect(res.body.message).toBe('Brand created successfully.');
    expect(res.body.data).toMatchObject({ name: 'Matte Co', slug: 'matte', sortOrder: 2, isActive: true });
    expect(res.body.data).not.toHaveProperty('unknownField');
    brandId = res.body.data.id;
  });

  it('POST /v1/brands rejects an invalid body with 400', async () => {
    const res = await request(app.getHttpServer()).post('/v1/brands').send({ slug: 'x' }).expect(400);
    expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('name')]));
  });

  it('POST /v1/brands returns 409 for a duplicate slug', async () => {
    await request(app.getHttpServer()).post('/v1/brands').send({ name: 'Dup', slug: 'matte' }).expect(409);
  });

  it('GET /v1/brands lists with search and pagination meta', async () => {
    const res = await request(app.getHttpServer()).get('/v1/brands?search=mat').expect(200);

    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.meta).toEqual({ total: 1, perPage: 25, currentPage: 1, lastPage: 1 });
  });

  it('GET /v1/brands/:id returns one brand', async () => {
    const res = await request(app.getHttpServer()).get(`/v1/brands/${brandId}`).expect(200);
    expect(res.body.data.id).toBe(brandId);
  });

  it('PUT /v1/brands/:id updates a brand', async () => {
    const res = await request(app.getHttpServer()).put(`/v1/brands/${brandId}`).send({ sortOrder: 7 }).expect(200);
    expect(res.body.data.sortOrder).toBe(7);
  });

  it('DELETE /v1/brands/:id soft deletes, then the brand 404s', async () => {
    await request(app.getHttpServer()).delete(`/v1/brands/${brandId}`).expect(200);
    await request(app.getHttpServer()).get(`/v1/brands/${brandId}`).expect(404);
  });
});

describe('Brands (e2e, unauthenticated)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(moduleFixture.createNestApplication());
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /v1/brands is forbidden without the brand.read permission', async () => {
    const res = await request(app.getHttpServer()).get('/v1/brands').expect(403);
    expect(res.body).toEqual({ message: 'Missing required permission: brand.read' });
  });
});
