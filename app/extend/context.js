'use strict';

module.exports = {
  async ensurePermission(site_id, type) {
    let errMsg;
    if (!this.state) {
      errMsg = 'No valid authorization token was found';
    } else if (!this.state.user) {
      errMsg = 'No valid authorization token was found';
    } else if (!this.state.user.id) {
      errMsg = 'Invalid token';
    } else {
      const permitted = await this.service.keepwork.ensurePermission(
        this.state.user.id, site_id, type);
      if (!permitted) {
        errMsg = 'Not allowed to access this protected resource';
      }
    }

    if (errMsg) { this.throw(401, errMsg); }
    this.user = this.state.user;
  },
};
