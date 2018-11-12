'use strict';

class ErrorHandler {
  static handle(err, ctx) {
    ctx.logger.error(err);
    const handler = ErrorHandler[err.name] || ErrorHandler.InternalServerError;
    const errMsg = handler(err, ctx);
    ctx.body = { error: errMsg };
  }

  static UnprocessableEntityError(err, ctx) {
    ctx.status = 400;
    return ErrorHandler.BadRequestError(err, ctx);
  }

  static BadRequestError(err) {
    return err.errors || err.message;
  }

  static ConflictError(err) {
    return err.message || 'Already exists';
  }

  static UnauthorizedError(err) {
    return err.message;
  }

  static NotFoundError(err) {
    return err.message || 'Not found';
  }

  static InternalServerError(err, ctx) {
    ctx.status = 500;
    return 'An unknown error happened';
  }

  static PayloadTooLargeError() {
    return 'This request is too large';
  }
}

module.exports = {
  accepts() {
    return 'json';
  },
  json(err, ctx) {
    ErrorHandler.handle(err, ctx);
  },
};
