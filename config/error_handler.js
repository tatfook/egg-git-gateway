'use strict';

class ErrorHandler {
  static handle(err, ctx) {
    try {
      ctx.body = { error: err.name };
      this[err.name](err, ctx);
    } catch (handlerNotFoundError) {
      console.log(handlerNotFoundError);
      this.InternalServerError(err, ctx);
    }
  }

  static BadRequestError(err, ctx) {
    ctx.body.detail = ctx.errors || err.message;
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
