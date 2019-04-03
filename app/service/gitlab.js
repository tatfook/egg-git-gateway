'use strict';

const Service = require('egg').Service;
const Axios = require('axios');
const assert = require('assert');

let Client;
let Raw_Client;

class GitlabService extends Service {
  get client() {
    if (!Client) {
      const GITLAB_CONFIG = this.config.gitlab;
      Client = Axios.create({
        baseURL: GITLAB_CONFIG.url,
        headers: { 'private-token': GITLAB_CONFIG.admin_token },
        timeout: 30 * 1000,
      });
    }
    return Client;
  }

  get raw_client() {
    if (!Raw_Client) {
      const GITLAB_CONFIG = this.config.gitlab;
      Raw_Client = Axios.create({
        baseURL: GITLAB_CONFIG.raw_url,
        headers: { 'private-token': GITLAB_CONFIG.admin_token },
        timeout: 30 * 1000,
      });
    }
    return Raw_Client;
  }

  // account
  serialize_new_account(user) {
    return {
      username: user.username,
      name: user.name,
      email: user.email,
      password: user.password,
      skip_confirmation: true,
    };
  }

  serialize_loaded_account(res_data) {
    return {
      username: res_data.username,
      name: res_data.name,
      _id: res_data.id,
    };
  }

  async get_account(username) {
    const res = await this.client
      .get(`/users?username=${username}`)
      .catch(err => {
        this.app.logger.error(`failed to get git account ${username}`);
        this.app.logger.error(err);
        throw err;
      });
    if (res.data.length > 0) { return res.data[0]; }
  }

  async create_account(user) {
    assert(user.username);
    assert(user.password);
    let registered_account;
    const account = this.serialize_new_account(user);
    await this.client
      .post('/users', account)
      .then(res => {
        registered_account = res.data;
      })
      .catch(async err => {
        if (err.response.status === 409) {
          registered_account = await this.get_account(user.username);
          return;
        }
        this.app.logger.error(`failed to create git account for ${user.username}`);
        this.app.logger.error(err);
        throw err;
      });
    return this.serialize_loaded_account(registered_account);
  }

  async delete_account(account_id) {
    assert(account_id);
    await this.client
      .delete(`/users/${account_id}?hard_delete=true`, { hard_delete: true })
      .catch(err => {
        this.app.logger.error(`failed to delete git account ${account_id}`);
        this.app.logger.error(err);
        throw err;
      });
  }

  async get_token(account_id) {
    let token = await this.get_active_token(account_id);
    if (!token) { token = await this.create_token(account_id); }
    return token;
  }

  async get_active_token(account_id) {
    assert(account_id);
    const res = await this.client
      .get(`/users/${account_id}/impersonation_tokens?state=active`)
      .catch(err => {
        this.app.logger.error(`failed to get token of git account ${account_id}`);
        this.app.logger.error(err);
        throw err;
      });
    for (const item of res.data) {
      if (item.name === 'keepwork') { return item.token; }
    }
  }

  async create_token(account_id) {
    assert(account_id);
    const res = await this.client
      .post(`/users/${account_id}/impersonation_tokens`, {
        name: 'keepwork',
        expires_at: '2222-12-12',
        scopes: [ 'api', 'read_user' ],
      }).catch(err => {
        this.app.logger.error(`failed to create token of git account ${account_id}`);
        this.app.logger.error(err);
        throw err;
      });
    return res.data.token;
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
      _id: res_data.id,
      visibility: res_data.visibility,
      name: res_data.name,
      git_path: res_data.path_with_namespace,
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
    hook_setting._id = project_id;
    await this.client
      .post(`/projects/${project_id}/hooks`, hook_setting)
      .catch(err => {
        this.app.logger.error(`failed to set hook of project ${project_id}`);
        this.app.logger.error(err);
        throw err;
      });
  }

  async set_admin(project_id) {
    const options = {
      user_id: 1,
      access_level: 40,
    };
    await this.client.post(`/projects/${project_id}/members`, options)
      .catch(err => {
        this.app.logger.error(err);
        throw err;
      });
  }

  async create_project(project) {
    assert(project.name);
    assert(project.account_id);

    let serialized_project = this.serialize_new_project(project);
    const res = await this.client
      .post(`/projects/user/${serialized_project.user_id}`, serialized_project)
      .catch(err => {
        this.app.logger.error(`failed to create git project ${serialized_project.name}`);
        this.app.logger.error(err);
        throw err;
      });
    serialized_project = this.serialize_loaded_project(res.data);
    await this.set_admin(serialized_project._id);
    return serialized_project;
  }

  async update_project_visibility(project_id, visibility) {
    assert(project_id);
    assert(visibility);
    const res = await this.client
      .put(`projects/${project_id}`, { visibility })
      .catch(err => {
        this.app.logger.error(`failed to update visibility of project ${project_id}`);
        this.app.logger.error(err);
        throw err;
      });
    return this.serialize_loaded_project(res.data);
  }

  async delete_project(project_id) {
    assert(project_id);
    await this.client
      .delete(`/projects/${project_id}`)
      .catch(err => {
        this.app.logger.error(`failed to delete project ${project_id}`);
        this.app.logger.error(err);
        throw err;
      });
  }

  // file
  serialized_loaded_file(res_data) {
    return {
      name: res_data.file_name,
      content: Buffer.from(res_data.content, res_data.encoding).toString(),
      blob_id: res_data.blob_id,
      commit_id: res_data.commit_id,
      last_commit_id: res_data.last_commit_id,
    };
  }

  async load_file(project_id, file_path, ref = 'master') {
    assert(project_id);
    assert(file_path);
    file_path = encodeURIComponent(file_path);
    const res = await this.client
      .get(`/projects/${project_id}/repository/files/${file_path}?ref=${ref}`)
      .catch(err => {
        this.app.logger.error(`failed to get file ${file_path} of project ${project_id}`);
        this.app.logger.error(err);
        throw err;
      });
    return this.serialized_loaded_file(res.data);
  }

  async load_raw_file(git_path, file_path) {
    assert(git_path);
    assert(file_path);
    const res = await this.raw_client
      .get(`/${git_path}/raw/master/${file_path}`)
      .catch(err => {
        this.app.logger.error(`failed to get file ${file_path} of project ${git_path}`);
        this.app.logger.error(err);
        throw err;
      });
    if (file_path.endsWith('.json')) { res.data = JSON.stringify(res.data); }
    if (res.data.startsWith('<!DOCTYPE html>')) { throw { response: { status: 404 } }; }
    return { content: res.data };
  }

  async load_commits(project_id) {
    const res = await this.client
      .get(`/projects/${project_id}/repository/commits?all=true`);
    const commits = res.data;
    return commits;
  }
}

module.exports = GitlabService;
