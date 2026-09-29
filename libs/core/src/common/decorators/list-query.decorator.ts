import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { parseListQuery } from '../utils/query-parser.util.js';
import { ParsedListQuery } from '../interfaces/list-query.interface.js';

/**
 * `index(@ListQuery() query: ParsedListQuery)` - parses & normalizes
 * `request.query` in one step instead of relying on a whitelisting
 * ValidationPipe DTO, since comparison-operator params (`__gte_price`) are
 * dynamic keys a DTO class can't declare up front. See query-parser.util.ts.
 */
export const ListQuery = createParamDecorator(
  (defaultPerPage: number | undefined, ctx: ExecutionContext): ParsedListQuery => {
    const request = ctx.switchToHttp().getRequest();
    return parseListQuery(request.query, defaultPerPage);
  },
);
