'use strict';

const Service = require('egg').Service;

const FILE_TYPE = 'blob';

class NodeService extends Service {
  async getCommits(project_id, path, skip = 0, limit = 20) {
    const { ctx, service } = this;
    const node = await ctx.model.Node.get_commits(project_id, path, skip, limit);
    if (node.type !== FILE_TYPE) return { commits: [], total: 0 };
    if (!node) ctx.throw(404, 'File not found');
    if (node.commits.length > 0) {
      return { commits: node.commits, total: node.version };
    }
    node.commits = await service.gitlab.load_all_commits(project_id, path);
    const latestCommit = node.commits[0];
    node.version = latestCommit.version;
    await node.save();
    return { commits: node.commits.slice(skip, limit), total: node.version };
  }
}

module.exports = NodeService;
