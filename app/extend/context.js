'use strict';

const { empty } = require('../helper');

module.exports = {
  async ensurePermission(site_id, type) {
    let errMsg;
    this.state = this.state || {};

    if (empty(this.state.user)) {
      errMsg = 'The resource is protected.Valid authorization token was required';
    } else if (!this.state.user._id) {
      errMsg = 'Invalid token';
    } else {
      const permitted = await this.service.keepwork.ensurePermission(
        this.state.user._id, site_id, type);
      if (!permitted) {
        errMsg = 'Not allowed to access this protected resource';
      }
    }

    if (errMsg) { this.throw(401, errMsg); }
    this.user = this.state.user;
  },
  ensureAdmin() {
    const errMsg = 'Page not found';
    this.state = this.state || {};
    this.state.user = this.state.user || {};
    console.log(this.state.user);
    const not_permitted = empty(this.state.user) || this.state.user.roleId !== 10;
    if (not_permitted) { this.throw(404, errMsg); }
    this.user = this.state.user;
  },
};
