import { ParsedListQuery } from '../common/interfaces/searchable-model.interface';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { IBaseRepository } from '../repositories/base-repository.interface';

/**
 * Optional business-logic layer between a controller and a repository -
 * equivalent of Modules/Core/app/Services/BaseService.php, but goes one step
 * further: since the Laravel BrandService (see Modules/Brand/app/Services/BrandService.php)
 * turned out to be five pass-through methods with no real logic, this base
 * class implements plain index/store/show/update/destroy CRUD by delegating
 * to the injected repository. A concrete service extending this needs zero
 * code for plain CRUD, and only overrides the method(s) that need real
 * business logic (checkout, stock adjustment, price calc, ...).
 *
 * This is the one deliberate departure from a literal port: Laravel's
 * HasBinding/factory() trait (runtime macro registration + conditional
 * concrete-class swapping) is dropped entirely, because Nest's constructor
 * DI + custom providers (`{ provide: X, useClass: ConditionalX }`) already
 * solve "swap the concrete implementation" without a bespoke trait.
 */
export abstract class BaseCrudService<T> {
  constructor(protected readonly repository: IBaseRepository<T>) {}

  index(query: ParsedListQuery, populate: string[] = []): Promise<PaginatedResult<T> | T[]> {
    return this.repository.findAll(query, populate);
  }

  show(id: string, populate: string[] = []): Promise<T> {
    return this.repository.findById(id, populate);
  }

  store<D>(data: D): Promise<T> {
    return this.repository.create(data as unknown as Partial<T>);
  }

  update<D>(id: string, data: D): Promise<T> {
    return this.repository.update(id, data as unknown as Partial<T>);
  }

  destroy(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  restore(id: string): Promise<T> {
    return this.repository.restore(id);
  }
}
