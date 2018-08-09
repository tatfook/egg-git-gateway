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
};
