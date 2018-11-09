'use strict';

class ErrorHandler {
  static handle(err, ctx) {
    try {
      ctx.logger.error(err);
      this[err.name](err, ctx);
    } catch (handlerNotFoundError) {
      this.InternalServerError(err, ctx);
    }
  }

  static UnprocessableEntityError(err, ctx) {
    ctx.status = 400;
    this.BadRequestError(err, ctx);
  }

  static BadRequestError(err, ctx) {
    ctx.body = { error: err.errors || err.message };
  }

  static ConflictError(err, ctx) {
    ctx.body = { error: err.message || 'Already exists' };
  }

  static UnauthorizedError(err, ctx) {
    ctx.body = { error: err.message };
  }

  static NotFoundError(err, ctx) {
    ctx.body = { error: err.message };
  }

  static InternalServerError(err, ctx) {
    ctx.status = 500;
    ctx.body = {
      error: 'An unknown error happened',
    };
  }

  static PayloadTooLargeError(err, ctx) {
    ctx.body = { error: 'This request is too large' };
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
