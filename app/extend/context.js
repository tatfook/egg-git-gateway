'use strict';

const { empty } = require('../lib/helper');

const isAdmin = user => {
  return user.roleId === 10;
};

const HTTP_AUTH_REQUIRED_STATUS = 401;
const HTTP_NOT_ALLOWED_STATUS = 403;

const NOT_ALLOWED_ERROR_MSG = 'Not allowed to access this protected resource';
const AUTH_REQUIRED_ERROR_MSG = 'Valid authorization token was required';
const INVALID_TOKEN_ERROR_MSG = 'Invalid token';

module.exports = {
  verify() {
    let errMsg;
    this.state = this.state || {};
    if (empty(this.state.user)) {
      errMsg = AUTH_REQUIRED_ERROR_MSG;
    } else if (!this.state.user.userId || !this.state.user.username) {
      errMsg = INVALID_TOKEN_ERROR_MSG;
    }
    if (errMsg) { this.throw(HTTP_AUTH_REQUIRED_STATUS, errMsg); }
  },

  async ensurePermission(site_id, type) {
    this.verify();
    if (isAdmin(this.state.user)) { return; }
    const token = this.headers.authorization;
    const permitted = await this.service.keepwork
      .ensurePermission(token, site_id, type);
    if (!permitted) {
      this.throw(HTTP_NOT_ALLOWED_STATUS, NOT_ALLOWED_ERROR_MSG);
    }
  },

  ensureAdmin() {
    const errMsg = NOT_ALLOWED_ERROR_MSG;
    this.state = this.state || {};
    this.state.user = this.state.user || {};
    const not_permitted = empty(this.state.user) || !isAdmin(this.state.user);
    if (not_permitted) { this.throw(HTTP_NOT_ALLOWED_STATUS, errMsg); }
  },

  async validateToken() {
    this.verify();
    const token = this.headers.authorization;
    await this.service.keepwork
      .getUserProfile(token)
      .catch(err => {
        this.ctx.logger.error(err);
        const errMsg = INVALID_TOKEN_ERROR_MSG;
        this.throw(HTTP_AUTH_REQUIRED_STATUS, errMsg);
      });
    return true;
  },
};
