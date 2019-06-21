'use strict';

const Service = require('egg').Service;

const FILE_TYPE = 'blob';

class NodeService extends Service {
  async getCommits(project_id, path, skip = 0, limit = 20) {
    const { ctx } = this;
    const node = await ctx.model.Node.getCommits(project_id, path, skip, limit);
    if (node.type !== FILE_TYPE) return { commits: [], total: 0 };
    if (!node) ctx.throw(404, 'File not found');
    if (node.commits.length > 0) {
      return { commits: node.commits, total: node.version };
    }
    return await this.getCommitsFromGitlab(node, skip, limit);
  }

  async getCommitsFromGitlab(node, skip, limit) {
    const { service } = this;
    node.commits = await service.gitlab.loadAllCommits(node.project_id, node.path);
    const latestCommit = node.commits[0];
    node.version = latestCommit.version;
    node.commits.reverse();
    await node.save();
    return { commits: node.commits.reverse().slice(skip, skip + limit), total: node.version };
  }
}

module.exports = NodeService;
