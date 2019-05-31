'use strict';

const { empty } = require('../lib/helper');

const isAdmin = user => {
  return user.roleId === 10;
};

module.exports = {
  verify() {
    let errMsg;
    this.state = this.state || {};
    if (empty(this.state.user)) {
      errMsg = 'Valid authorization token was required';
    } else if (!this.state.user.userId || !this.state.user.username) {
      errMsg = 'Invalid token';
    }
    if (errMsg) { this.throw(401, errMsg); }
  },
  async ensurePermission(site_id, type) {
    this.verify();
    if (isAdmin(this.state.user)) { return; }
    const token = this.headers.authorization;
    const permitted = await this.service.keepwork
      .ensurePermission(token, site_id, type);
    if (!permitted) {
      const errMsg = 'Not allowed to access this protected resource';
      this.throw(403, errMsg);
    }
  },
  ensureAdmin() {
    const errMsg = 'Not allowed to access this protected resource';
    this.state = this.state || {};
    this.state.user = this.state.user || {};
    const not_permitted = empty(this.state.user) || !isAdmin(this.state.user);
    if (not_permitted) { this.throw(403, errMsg); }
  },
  async validateToken() {
    this.verify();
    const token = this.headers.authorization;
    await this.service.keepwork
      .getUserProfile(token)
      .catch(err => {
        this.ctx.logger.error(err);
        const errMsg = 'Invalid token';
        this.throw(401, errMsg);
      });
    return true;
  },
};
