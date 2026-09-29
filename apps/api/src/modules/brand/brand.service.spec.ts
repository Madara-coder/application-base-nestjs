import { Test, TestingModule } from '@nestjs/testing';
import { BrandService } from './brand.service.js';
import { BrandRepository } from './brand.repository.js';

describe('BrandService', () => {
  let service: BrandService;
  const repository = { create: vi.fn(), update: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [BrandService, { provide: BrandRepository, useValue: repository }],
    }).compile();

    service = module.get(BrandService);
  });

  it('stamps createdBy on store()', async () => {
    await service.store({ name: 'Matte', slug: 'matte' }, 'user-1');
    expect(repository.create).toHaveBeenCalledWith({ name: 'Matte', slug: 'matte', createdBy: 'user-1' });
  });

  it('stamps updatedBy on update()', async () => {
    await service.update('brand-1', { name: 'Gloss' }, 'user-2');
    expect(repository.update).toHaveBeenCalledWith('brand-1', { name: 'Gloss', updatedBy: 'user-2' });
  });
});
