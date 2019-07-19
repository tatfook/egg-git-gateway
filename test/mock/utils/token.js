'use strict';

const jwt = require('keepwork-jwt-simple');

const admin = {
  username: 'unittest',
  userId: 1,
  roleId: 10,
};

module.exports = app => {
  const secret = app.config.jwt.secret;
  return class MockToken {
    static getAdminToken() {
      return this.get(admin);
    }

    static get(user) {
      const payload = {
        username: user.username || user.kw_username,
        userId: user.userId || user.kw_id,
        roleId: user.roleId || 1,
      };
      return jwt.encode(payload, secret, 'HS1');
    }
  };
};
