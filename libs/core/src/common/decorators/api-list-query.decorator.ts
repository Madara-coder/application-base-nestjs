import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

/**
 * Documents the @ListQuery() contract in Swagger. Pair it with @ListQuery()
 * on list endpoints: the params are parsed from the raw query string (not a
 * DTO), so Swagger can't infer them.
 */
export const ApiListQuery = (searchableFields: string[] = []) => {
  const fields = searchableFields.length ? ` Searchable fields: ${searchableFields.join(', ')}.` : '';

  return applyDecorators(
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'perPage', required: false, type: Number, example: 25 }),
    ApiQuery({ name: 'noPaginate', required: false, type: Boolean, description: 'Return a plain array.' }),
    ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: `Case-insensitive match across the searchable fields.${fields}`,
    }),
    ApiQuery({ name: 'withTrashed', required: false, type: Boolean }),
    ApiQuery({ name: 'onlyTrashed', required: false, type: Boolean }),
    ApiQuery({
      name: 'filter',
      required: false,
      style: 'deepObject',
      explode: true,
      type: 'object',
      description:
        'filter[0][filterBy]=field&filter[0][value]=x (contains match). Comparison params are also ' +
        'supported as <prefix><field>=value, with prefixes __gt_ __gte_ __lt_ __lte_ __eq_ __neq_ ' +
        `__in_ __nin_ (comma-separated) __like_ __nlike_, e.g. __gte_sortOrder=2.${fields}`,
    }),
  );
};
