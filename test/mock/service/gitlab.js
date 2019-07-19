'use strict';

const { factory } = require('factory-girl');

class MockGitlabServie {
  static async createAccount(user) {
    return {
      name: user.name,
      username: user.username,
      _id: factory.chance('natural', { max: 1000 })(),
    };
  }

  static async getToken() {
    return factory.chance('string', { length: 50 })();
  }
}

module.exports = () => MockGitlabServie;
