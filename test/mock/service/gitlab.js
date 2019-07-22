'use strict';

const { factory } = require('factory-girl');

const DEFAULT_VISIBILITY = 'public';
const PREFIX = 'gitlab_unittest_';

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

  static async createProject(project) {
    const res = {
      name: project.name,
      user_id: project.account_id,
      visibility: project.visibility || DEFAULT_VISIBILITY,
      request_access_enabled: true,
    };

    const username = this.ctx.params.kw_username;

    return {
      _id: factory.chance('natural', { max: 1000 })(),
      visibility: res.visibility,
      name: res.name,
      git_path: `${PREFIX}${username}/${res.name}`,
      account_id: res.user_id,
    };
  }
}

module.exports = () => MockGitlabServie;
