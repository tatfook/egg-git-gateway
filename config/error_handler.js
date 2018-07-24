'use strict';

class ErrorHandler {
  static handle(err, ctx) {
    try {
      console.log(err.name);
      this[err.name](err, ctx);
    } catch (handlerNotFoundError) {
      console.log(handlerNotFoundError);
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
    ctx.body = { error: 'Already exists' };
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
}

module.exports = {
  accepts() {
    return 'json';
  },
  json(err, ctx) {
    ErrorHandler.handle(err, ctx);
  },
};
