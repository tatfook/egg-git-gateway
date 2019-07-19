'use strict';

const Service = require('egg').Service;
const { basename } = require('path');
const _ = require('lodash');

const FILE_TYPE = 'blob';

class NodeService extends Service {
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

  getFileName(path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    return basename(path);
  }
}

module.exports = NodeService;
