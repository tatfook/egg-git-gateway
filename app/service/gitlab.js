'use strict';

const Service = require('egg').Service;
const Axios = require('axios');
const assert = require('assert');

let Client;

class GitlabService extends Service {
  get client() {
    if (!Client) {
      const GITLAB_CONFIG = this.config.gitlab;
      Client = Axios.create({
        baseURL: `${GITLAB_CONFIG.url}/api/v4`,
        headers: { 'private-token': GITLAB_CONFIG.admin_token },
        timeout: 30 * 1000,
      });
    }
    return Client;
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

  async create_account(user) {
    assert(user.username);
    assert(user.password);
    const account = this.serialize_new_account(user);
    const res = await this.client
      .post('/users', account)
      .catch(err => {
        this.app.logger.error(`failed to create git account for ${user.username}`);
        this.app.logger.error(err);
        throw err;
      });
    return this.serialize_loaded_account(res.data);
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

  async load_file(project_id, file_path) {
    assert(project_id);
    assert(file_path);
    file_path = encodeURIComponent(file_path);
    const res = await this.client
      .get(`/projects/${project_id}/repository/files/${file_path}?ref=master`)
      .catch(err => {
        this.app.logger.error(`failed to get file ${file_path} of project ${project_id}`);
        this.app.logger.error(err);
        throw err;
      });
    return this.serialized_loaded_file(res.data);
  }
}

module.exports = GitlabService;
