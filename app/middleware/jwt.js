'use strict';

const jwt = require('keepwork-jwt-simple');

const get_token = ctx => {
  let token = null;
  if (ctx.headers.authorization) {
    const splited_authorization = ctx.headers.authorization.split(' ');
    if (splited_authorization[0] !== 'Bearer') { ctx.throw(401, 'Bearer token required'); }
    token = ctx.token = splited_authorization[1];
  }
  return token;
};

module.exports = config => {
  return async (ctx, next) => {
    const token = get_token(ctx);
    ctx.state = {
      get user() {
        if (!token) { ctx.throw(401, 'Authorization required'); }
        try {
          const payload = jwt.decode(token, config.secret, false, 'HS1');
          return payload;
        } catch (err) {
          ctx.throw(401, err.message);
        }
      },
    };
    return await next();
  };
};
