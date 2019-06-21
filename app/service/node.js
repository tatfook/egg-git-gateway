'use strict';

const Service = require('egg').Service;

const FILE_TYPE = 'blob';

class NodeService extends Service {
  async getCommits(project_id, path, skip = 0, limit = 20) {
    const { ctx } = this;
    const file = await ctx.model.Node.getCommits(project_id, path, skip, limit);
    if (file.type !== FILE_TYPE) return { commits: [], total: 0 };
    if (!file) ctx.throw(404, 'File not found');
    if (file.commits.length > 0) {
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
}

module.exports = NodeService;
