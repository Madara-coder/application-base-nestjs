import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Typed exceptions for the common failure cases the Laravel ExceptionHandler
 * trait special-cased (ModelNotFoundException, QueryException error codes
 * 1062/1451, ...). Throw these from a repository/service instead of a
 * generic Error so AllExceptionsFilter can map them to the right status
 * code + message without string-matching driver errors by hand.
 */
export class RecordNotFoundException extends HttpException {
  constructor(name = 'Record') {
    super({ message: `${name} not found.` }, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateEntryException extends HttpException {
  constructor(message = 'Duplicate entry.') {
    super({ message }, HttpStatus.CONFLICT);
  }
}

export class ForeignKeyConstraintException extends HttpException {
  constructor(message = 'Cannot delete or update: this record is referenced elsewhere.') {
    super({ message }, HttpStatus.CONFLICT);
  }
}

export class LastRecordDeleteException extends HttpException {
  constructor(name = 'Record') {
    super({ message: `Cannot delete the last ${name}.` }, HttpStatus.CONFLICT);
  }
}
