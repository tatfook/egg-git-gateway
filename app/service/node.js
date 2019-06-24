'use strict';

const Service = require('egg').Service;

const FILE_TYPE = 'blob';

class NodeService extends Service {
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

  async getCommitsFromGitlab(file, skip, limit) {
    const { service } = this;
    file.commits = await service.gitlab.loadAllCommits(file.project_id, file.path);
    const latestCommit = file.commits[0];
    file.latest_commit = latestCommit;
    file.commits.reverse();
    await file.save();
    return {
      commits: file.commits.reverse().slice(skip, skip + limit),
      total: file.latest_commit.version,
      file,
    };
  }

  async getFileWithCommits(file) {
    if (!file.latest_commit) {
      const result = await this.getCommits(file.project_id, file.path, 0, 10000);
      file = result.file;
    }
    return file;
  }
}

module.exports = NodeService;
