'use strict';

const Service = require('egg').Service;
const Axios = require('axios');
const assert = require('assert');

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
    assert(user.username);
    assert(user.password);
    const account = this.serialize_new_account(user);
    const res = await this.client
      .post('/users', account)
      .catch(err => {
        console.log(`failed to create git account for ${user.username}`);
        console.error(err);
        throw err;
      });
    return this.serialize_loaded_account(res.data);
  }

  async delete_account(account_id) {
    assert(account_id);
    await this.client
      .delete(`/users/${account_id}`)
      .catch(err => {
        console.log(`failed to delete git account ${account_id}`);
        console.error(err);
        throw err;
      });
  }

  // project
  serialize_new_project(project) {
    return {
      name: project.name,
      user_id: project.account_id,
      visibility: project.visibility || 'public',
      request_access_enabled: true,
    };
  }

  serialize_loaded_project(res_data) {
    return {
      id: res_data.id,
      visibility: res_data.visibility,
      name: res_data.name,
      path: res_data.path_with_namespace,
      account_id: res_data.owner.id,
    };
  }

  serialize_hook_setting(project) {
    return {
      url: project.hook_url,
      push_events: project.push_events || true,
      enable_ssl_verification: project.enable_ssl_verification || false,
    };
  }

  async set_project_hooks(project_id, hook_setting) {
    assert(hook_setting.url);
    hook_setting.id = project_id;
    await this.client
      .post(`/projects/${project_id}/hooks`, hook_setting)
      .catch(err => {
        console.log(`failed to set hook of project ${project_id}`);
        console.error(err);
        throw err;
      });
  }

  async create_project(project) {
    assert(project.name);
    assert(project.account_id);
    assert(project.hook_url);

    let serialized_project = this.serialize_new_project(project);
    const res = await this.client
      .post(`/projects/user/${serialized_project.user_id}`, serialized_project)
      .catch(err => {
        console.log(`failed to create git project ${serialized_project.name}`);
        console.error(err);
        throw err;
      });
    serialized_project = this.serialize_loaded_project(res.data);
    const hook_setting = this.serialize_hook_setting(project);
    await this.set_project_hooks(serialized_project.id, hook_setting);
    return serialized_project;
  }

  async load_project(project_id) {
    assert(project_id);
    const res = await this.client
      .get(`projects/${project_id}`)
      .catch(err => {
        console.log(`failed to load project ${project_id} from gitlab`);
        console.error(err);
        throw err;
      });
    return this.serialize_loaded_project(res.data);
  }

  async update_project_visibility(project_id, visibility) {
    assert(project_id);
    assert(visibility);
    const res = await this.client
      .put(`projects/${project_id}`, { visibility })
      .catch(err => {
        console.log(`failed to update visibility of project ${project_id}`);
        console.error(err);
        throw err;
      });
    return this.serialize_loaded_project(res.data);
  }

  async delete_project(project_id) {
    assert(project_id);
    await this.client
      .delete(`/projects/${project_id}`)
      .catch(err => {
        console.log(`failed to delete project ${project_id}`);
        console.error(err);
        throw err;
      });
  }

  // file
  async load_file() { console.log('load file'); }

  // tree
  async load_tree() { console.log('load tree'); }
}

module.exports = GitlabService;
