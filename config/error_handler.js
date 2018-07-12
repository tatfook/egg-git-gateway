'use strict';

class ErrorHandler {
  static handle(err, ctx) {
    try {
      console.log(err.name);
      ctx.body = { error: err.name };
      this[err.name](err, ctx);
    } catch (handlerNotFoundError) {
      console.log(handlerNotFoundError);
      this.InternalServerError(err, ctx);
    }
  }

  static UnprocessableEntityError(err, ctx) {
    ctx.status = 400;
    ctx.body.error = 'BadRequestError';
    this.BadRequestError(err, ctx);
  }

  static BadRequestError(err, ctx) {
    ctx.body.detail = err.errors || err.message;
  }

  static ConflictError(err, ctx) {
    ctx.body.detail = 'Already exists';
  }

  static UnauthorizedError(err, ctx) {
    ctx.body.detail = 'Protected resource, use Authorization header to get access.';
  }

  static NotFoundError(err, ctx) {
    ctx.body.detail = err.message;
  }

  static InternalServerError(err, ctx) {
    ctx.status = 500;
    ctx.body = {
      error: 'Internal Server Error',
      detail: 'An unknown error happened',
    };
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
