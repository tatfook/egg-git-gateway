'use strict';

const Service = require('egg').Service;

class ProjectService extends Service {
  async getCommits(project_id, skip, limit) {
    const { service } = this;
    let commits = await service.gitlab.load_all_commits(project_id);
    commits = commits.slice(skip, skip + limit);
    return commits;
  }
}

module.exports = ProjectService;
