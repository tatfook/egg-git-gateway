'use strict';

const Service = require('egg').Service;
const { basename } = require('path');
const _ = require('lodash');

const FILE_TYPE = 'blob';
const PENDING_TIP = 'pending';
const DEFAULT_BRANCH = 'master';

const NODE_NOT_FOUND_ERROR_MSG = 'File or folder not found';
const NODE_ALREADY_EXISTS_ERROR_MSG = 'File or folder already exists';
const REPLICA_ERROR_MSG = 'Reduplicative files exist in your request';
const COMMIT_PENDING_MSG = 'Commit is pending';

const HTTP_NOT_FOUND_STATUS = 404;

class NodeService extends Service {
  async get(project_id, path, from_cache) {
    const { ctx } = this;
    path = path || ctx.params.path;
    const node = await ctx.model.Node
      .getByPath(project_id, path, from_cache);
    return node;
  }

  async getExistsNode(project_id, path, from_cache) {
    const { service } = this;
    const node = await this.get(project_id, path, from_cache);
    service.common.throwIfNotExist(node, NODE_NOT_FOUND_ERROR_MSG);
    return node;
  }

  async ensureNodeNotExist(project_id, path, from_cache) {
    const { service } = this;
    const node = await this.get(project_id, path, from_cache);
    service.common.throwIfExists(node, NODE_ALREADY_EXISTS_ERROR_MSG);
    return node;
  }

  async ensureNodesNotExist(project_id, files, from_cache) {
    for (const file of files) {
      await this.ensureNodeNotExist(project_id, file.path, from_cache);
    }
  }

  ensureUnique(files) {
    const { ctx } = this;
    const exist_paths = {};
    for (const file of files) {
      if (exist_paths[file.path]) ctx.throw(409, REPLICA_ERROR_MSG);
      exist_paths[file.path] = true;
    }
  }

  async ensureParentExist(account_id, project_id, path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    await ctx.model.Node.ensureParentExist(account_id, project_id, path);
  }

  async getFromGitlab(project) {
    const { ctx, service } = this;
    project = project || await this.getExistsNode();
    const file = await service.gitlab
      .loadRawFile(project.git_path, ctx.params.path);
    file.path = ctx.params.path;
    file.name = this.getFileName(file.path);
    file.project_id = project._id;
    file.account_id = project.account_id;
    await ctx.model.Node.create(file);
    return file;
  }

  async getFileByRef(project) {
    const { ctx, service } = this;
    const { ref, path } = ctx.params;

    if (ref === PENDING_TIP) ctx.throw(HTTP_NOT_FOUND_STATUS, COMMIT_PENDING_MSG);
    const file = await service.gitlab.loadFile(project._id, path, ref)
      .catch(err => {
        if (err.response.status === HTTP_NOT_FOUND_STATUS) {
          ctx.throw(err.response.status, err.response.data.message);
        }
      });
    return file;
  }

  // 如非master分支，则从gitlab获取
  // 如为master分支，先从本服务获取，如不存在则查询gitlab
  async getFromDBOrGitlab(project) {
    let file;
    const { ctx } = this;
    const { path, refresh_cache, ref = DEFAULT_BRANCH } = ctx.params;
    const from_cache = !refresh_cache;

    if (ref !== DEFAULT_BRANCH) {
      file = await this.getFileByRef(project);
    } else {
      file = await this.get(project._id, path, from_cache);
      file = file || await this.getFromGitlab(project);
    }
    return file;
  }

  // 查询commits信息， 如数据库中没有则到gitlab查
  async getCommits(project_id, path, skip = 0, limit = 20) {
    const { ctx } = this;
    const file = await ctx.model.Node.getCommits(project_id, path, skip, limit);
    if (!file) ctx.throw(404, 'File not found');
    if (file.type !== FILE_TYPE) return { commits: [], total: 0, file };
    if (file.latest_commit) {
      return { commits: file.commits, total: file.latest_commit.version, file };
    }
    return await this.getCommitsFromGitlab(file, skip, limit);
  }

  // 从gitlab获取commit信息
  async getCommitsFromGitlab(file, skip, limit) {
    const { service } = this;
    let commits = [];
    let total = 0;
    file.commits = await service.gitlab.loadAllCommits(file.project_id, file.path);
    const latestCommit = file.commits[0];
    file.latest_commit = latestCommit || {};

    if (!_.isEmpty(file.commits)) {
      file.commits.reverse();
      await file.save();
      commits = file.commits.reverse().slice(skip, skip + limit);
      total = file.latest_commit.version;
    }
    return { commits, total, file };
  }

  // 获取带commits信息的文件
  async getFileWithCommits(file) {
    if (!file.latest_commit) {
      const result = await this.getCommits(file.project_id, file.path, 0, 10000);
      file = result.file;
    }
    return file;
  }

  // 插入文件并创建临时commit, 同步到gitlab后补全数据
  async createAndCommit(isNewFile, ...nodes_to_create) {
    const { ctx } = this;
    const author_name = ctx.state.user.username;
    const commitInfo = { author_name, isNewFile };
    const files = await ctx.model.Node
      .createAndCommit(commitInfo, ...nodes_to_create);
    return files;
  }

  wrapMessage(message) {
    const { ctx } = this;
    const { helper } = ctx;
    const key = message.project_id;
    const { topics } = this.config.kafka;
    const gitMessage = {
      messages: message._id,
      topic: topics.commit,
      key,
    };
    const esMessage = {
      messages: helper.commitToMessage(message),
      topic: topics.elasticsearch,
      key,
    };
    return [ gitMessage, esMessage ];
  }

  async sendMessage(message) {
    const { service } = this;
    const payloads = this.wrapMessage(message);
    await service.kafka.send(payloads);
  }

  getMessageOptions(project) {
    const { ctx } = this;
    const { commit_message, source_version, encoding } = ctx.params;
    return {
      source_version,
      commit_message,
      encoding,
      author: ctx.state.user.username,
      visibility: project.visibility,
    };
  }

  getFileName(path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    return basename(path);
  }
}

module.exports = NodeService;
