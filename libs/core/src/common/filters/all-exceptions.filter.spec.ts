import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  function run(exception: unknown) {
    const json = vi.fn((_body: unknown) => undefined);
    const status = vi.fn((_code: number) => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', url: '/test' }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);
    return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
  }

  const queryError = (driverError: Record<string, unknown>, message = 'query failed') =>
    new QueryFailedError('SELECT 1', [], Object.assign(new Error(message), driverError));

  it('passes HttpExceptions through with their status', () => {
    expect(run(new NotFoundException('Brand not found.'))).toEqual({
      status: 404,
      body: { message: 'Brand not found.' },
    });
  });

  it.each([
    ['Postgres unique violation', { code: '23505' }, 409],
    ['MySQL duplicate entry', { code: 'ER_DUP_ENTRY' }, 409],
    ['Postgres foreign key violation', { code: '23503' }, 409],
    ['Postgres not-null violation', { code: '23502' }, 422],
    ['Postgres invalid uuid', { code: '22P02' }, 400],
  ])('maps a %s to %i', (_label, driverError, expected) => {
    expect(run(queryError(driverError)).status).toBe(expected);
  });

  it.each(['SQLITE_CONSTRAINT: UNIQUE constraint failed: brands.slug', 'UNIQUE constraint failed: brands.slug'])(
    'maps the SQLite message "%s" to 409',
    (message) => {
      expect(run(queryError({}, message)).status).toBe(409);
    },
  );

  it('hides unexpected errors behind a generic 500', () => {
    vi.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
    expect(run(new Error('secret internals'))).toEqual({
      status: 500,
      body: { message: 'Something went wrong. Please try again later.' },
    });
  });
});
