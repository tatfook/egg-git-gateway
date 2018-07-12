'use strict';

const Service = require('egg').Service;
const Axios = require('axios');

class GitlabService extends Service {
  constructor(ctx) {
    super(ctx);

    const GITLAB_CONFIG = this.config.gitlab;
    this.client = Axios.create({
      baseURL: `${GITLAB_CONFIG.url}/api/v4`,
      headers: { 'private-token': GITLAB_CONFIG.admin_token },
      timeout: 30 * 1000,
    });
  }

  // account
  serialize_new_account(user) {
    const GITLAB_CONFIG = this.config.gitlab;
    const account_name = `${GITLAB_CONFIG.account_prifix}${user.username}`;
    return {
      username: account_name,
      name: account_name,
      email: `${user.username}${GITLAB_CONFIG.email_postfix}`,
      password: user.password,
      skip_confirmation: true,
    };
  }

  serialize_loaded_account(res_data) {
    return {
      username: res_data.username,
      id: res_data.id,
    };
  }

  async create_account(user) {
    const account = this.serialize_new_account(user);
    const res = await this.client.post('/users', account).catch(err => {
      console.error(`failed to create git account for ${user.username}`);
      throw err;
    });
    return this.serialize_loaded_account(res.data);
  }

  async delete_account(account) {
    await this.client.delete(`/users/${account.id}`).catch(err => {
      console.error(`failed to delete git account ${account.id}`);
      throw err;
    });
  }

  // project
  serialize_loaded_project(res_data) {
    return {
      id: res_data.id,
      visibility: res_data.visibility,
      name: res_data.name,
      path: res_data.path,
      path_with_namespace: res_data.path_with_namespace,
      owner: res_data.owner,
      namespace: res_data.namespace,
    };
  }

  async create_project() { console.log('create project'); }

  async load_project(project_id) {
    const res = await this.client.get(`projects/${project_id}`).catch(err => {
      console.error(`failed to load project ${project_id} from gitlab`);
      throw err;
    });
    return this.serialize_loaded_project(res.data);
  }

  async update_project() { console.log('update project'); }
  async delete_project() { console.log('delete project'); }

  // file
  async load_file() { console.log('load file'); }
}

module.exports = GitlabService;
