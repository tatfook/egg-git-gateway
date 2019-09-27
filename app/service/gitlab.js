'use strict';

const Service = require('egg').Service;
const Axios = require('axios');
const _ = require('lodash/object');

const HTTP_CONFLICT_STATUS = 409;
const HTTP_NOT_FOUND_STATUS = 404;

const DEFAULT_TIME_OUT = 30 * 1000;
const DEFAULT_VISIBILITY = 'public';
const DEFAULT_PER_PAGE = 100;

const HTML_PREFIX = '<!DOCTYPE html>';

let Client;
let RawClient;

const COMMIT_PROPERTIES_TO_PICK = [
  'id', 'short_id', 'author_name', 'authored_date',
  'created_at', 'message',
];
const SOURCE_VERSION_FLAG = '|FROM';

const serializeCommits = commits => {
  let version = commits.length;
  return commits.map(commit => {
    const serilized = _.pick(commit, COMMIT_PROPERTIES_TO_PICK);
    serilized.version = version;
    serilized.commit_id = serilized.id;
    serilized.createdAt = serilized.created_at;
    serilized.updateAt = serilized.createdAt;
    serilized.source_version = serilized.message.split(SOURCE_VERSION_FLAG)[1];
    version--;
    return serilized;
  });
};

class GitlabService extends Service {
  handleError(err) {
    const { ctx } = this;
    ctx.throw(err.response.status, err.response.data);
  }

  get client() {
    if (!Client) {
      const GITLAB_CONFIG = this.config.gitlab;
      Client = Axios.create({
        baseURL: GITLAB_CONFIG.url,
        headers: { 'private-token': GITLAB_CONFIG.admin_token },
        timeout: GITLAB_CONFIG.timeout || DEFAULT_TIME_OUT,
      });
    }
    return Client;
  }

  get rawClient() {
    if (!RawClient) {
      const GITLAB_CONFIG = this.config.gitlab;
      RawClient = Axios.create({
        baseURL: GITLAB_CONFIG.raw_url,
        headers: { 'private-token': GITLAB_CONFIG.admin_token },
        timeout: GITLAB_CONFIG.timeout || DEFAULT_TIME_OUT,
      });
    }
    return RawClient;
  }

  // account
  serializeNewAccount(user) {
    return {
      username: user.username,
      name: user.name,
      email: user.email,
      password: user.password,
      skip_confirmation: true,
    };
  }

  serializeLoadedAccount(res_data) {
    return {
      username: res_data.username,
      name: res_data.name,
      _id: res_data.id,
    };
  }

  async getAccount(username) {
    const res = await this.client
      .get(`/users?username=${username}`)
      .catch(err => this.handleError(err));
    if (res.data.length > 0) return res.data[0];
  }

  async createAccount(user) {
    let registered_account;
    const account = this.serializeNewAccount(user);
    await this.client.post('/users', account)
      .then(res => { registered_account = res.data; })
      .catch(async err => {
        if (err.response.status === HTTP_CONFLICT_STATUS) {
          registered_account = await this.getAccount(user.username);
        } else {
          throw err;
        }
      });
    return this.serializeLoadedAccount(registered_account);
  }

  async deleteAccount(account_id) {
    await this.client
      .delete(`/users/${account_id}?hard_delete=true`, { hard_delete: true })
      .catch(err => this.handleError(err));
  }

  async getToken(account_id) {
    let token = await this.getActiveToken(account_id);
    if (!token) token = await this.createToken(account_id);
    return token;
  }

  async getActiveToken(account_id) {
    const res = await this.client
      .get(`/users/${account_id}/impersonation_tokens?state=active`)
      .catch(err => this.handleError(err));
    for (const item of res.data) {
      if (item.name === 'keepwork') return item.token;
    }
  }

  async createToken(account_id) {
    const res = await this.client
      .post(`/users/${account_id}/impersonation_tokens`, {
        name: 'keepwork',
        expires_at: '2222-12-12',
        scopes: [ 'api', 'read_user' ],
      }).catch(err => this.handleError(err));
    return res.data.token;
  }

  // project
  serializeNewProject(project) {
    return {
      name: project.name,
      user_id: project.account_id,
      visibility: project.visibility || DEFAULT_VISIBILITY,
      request_access_enabled: true,
    };
  }

  serializeLoadedProject(res_data) {
    return {
      _id: res_data.id,
      visibility: res_data.visibility,
      name: res_data.name,
      git_path: res_data.path_with_namespace,
      account_id: res_data.owner.id,
    };
  }

  serializeHookSetting(project) {
    return {
      url: project.hook_url,
      push_events: project.push_events || true,
      enable_ssl_verification: project.enable_ssl_verification || false,
    };
  }

  async setProjectHooks(project_id, hook_setting) {
    hook_setting._id = project_id;
    await this.client
      .post(`/projects/${project_id}/hooks`, hook_setting)
      .catch(err => this.handleError(err));
  }

  async setAdmin(project_id) {
    const options = {
      user_id: 1,
      access_level: 40,
    };
    await this.client.post(`/projects/${project_id}/members`, options)
      .catch(err => this.handleError(err));
  }

  async createProject(project) {
    let serialized_project = this.serializeNewProject(project);
    const res = await this.client
      .post(`/projects/user/${serialized_project.user_id}`, serialized_project)
      .catch(err => this.handleError(err));
    serialized_project = this.serializeLoadedProject(res.data);
    return serialized_project;
  }

  async updateProjectVisibility(project_id, visibility) {
    const res = await this.client
      .put(`projects/${project_id}`, { visibility })
      .catch(err => this.handleError(err));
    return this.serializeLoadedProject(res.data);
  }

  async deleteProject(project_id) {
    return await this.client
      .delete(`/projects/${project_id}`)
      .catch(err => this.handleError(err));
  }

  // file
  serializedLoadedFile(res_data) {
    return {
      name: res_data.file_name,
      content: Buffer.from(res_data.content, res_data.encoding).toString(),
      blob_id: res_data.blob_id,
      commit_id: res_data.commit_id,
      last_commit_id: res_data.last_commit_id,
    };
  }

  async loadFile(project_id, file_path, ref = 'master') {
    file_path = encodeURIComponent(file_path);
    const res = await this.client
      .get(`/projects/${project_id}/repository/files/${file_path}?ref=${ref}`)
      .catch(err => this.handleError(err));
    return this.serializedLoadedFile(res.data);
  }

  async loadRawFile(git_path, file_path) {
    const res = await this.rawClient
      .get(`/${git_path}/raw/master/${file_path}`)
      .catch(err => this.handleError(err));
    if (file_path.endsWith('.json')) res.data = JSON.stringify(res.data);
    if (res.data.startsWith(HTML_PREFIX)) {
      throw { response: { status: HTTP_NOT_FOUND_STATUS } };
    }
    return { content: res.data };
  }

  async loadCommits(project_id, path, page = 1, per_page = DEFAULT_PER_PAGE) {
    const res = await this.client
      .get(`/projects/${project_id}/repository/commits`, {
        params: { path, page, per_page },
      });
    const commits = res.data;
    return commits;
  }

  async loadAllCommits(project_id, path) {
    let page = 1;
    const per_page = DEFAULT_PER_PAGE;
    let commits = await this.loadCommits(project_id, path, page, per_page);
    const all = commits;
    while (commits.length >= DEFAULT_PER_PAGE) {
      page++;
      commits = await this.loadCommits(project_id, path, page, per_page);
      all.push(...commits);
    }
    return serializeCommits(all);
  }
}

module.exports = GitlabService;
