'use strict';

const { empty } = require('../lib/helper');

const isAdmin = user => {
  return user.roleId === 10;
};

module.exports = {
  async ensurePermission(site_id, type) {
    let errMsg;
    this.state = this.state || {};

    if (empty(this.state.user)) {
      errMsg = 'The resource is protected.Valid authorization token was required';
    } else if (!this.state.user.userId || !this.state.user.username) {
      errMsg = 'Invalid token';
    } else {
      if (isAdmin(this.state.user)) { return; }
      const token = this.headers.authorization;
      const permitted = await this.service.keepwork
        .ensurePermission(token, site_id, type);
      if (!permitted) {
        errMsg = 'Not allowed to access this protected resource';
      }
    }
    if (errMsg) { this.throw(401, errMsg); }
  },
  ensureAdmin() {
    const errMsg = 'Not allowed to access this protected resource';
    this.state = this.state || {};
    this.state.user = this.state.user || {};
    const not_permitted = empty(this.state.user) || !isAdmin(this.state.user);
    if (not_permitted) { this.throw(401, errMsg); }
  },
};
