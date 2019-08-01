'use strict';

const Service = require('egg').Service;

const ERR_MSGS = {
  projectNotFound: 'Project not found',
  projectAlreadyExist: 'Project already exists',
};

const PRIVATE_VISIBILITY = 'private';
const READ_PERMISSION = 'r';
const READ_WRITE_PERMISSION = 'rw';

class ProjectService extends Service {
  async getByPath(path, fromCache) {
    const { ctx } = this;
    path = path || ctx.params.project_path || ctx.params.path;
    const project = await ctx.model.Project
      .getByPath(path, fromCache);
    return project;
  }

  async deleteByPath(path) {
    const { ctx, service } = this;
    path = path || ctx.params.project_path || ctx.params.path;
    const project = await this.getExistsProject(path, false);

    // 删除相关数据
    await ctx.model.Node.deleteProject(project._id);
    await service.gitlab.deleteProject(project._id);
    await ctx.model.Project.deleteAndReleaseCache(project.path);
    return project;
  }

  // 项目不存在则返回404
  async getExistsProject(path, fromCache) {
    const { service } = this;
    const project = await this.getByPath(path, fromCache);
    service.common.throwIfNotExist(project, ERR_MSGS.projectNotFound);
    return project;
  }

  // 验证用户是否有项目读权限，有则返回项目，没有则报错
  async getReadableProject(path, fromCache) {
    const { ctx, config } = this;
    path = path || ctx.params.project_path || ctx.params.path;
    const project = await this.getExistsProject(path, fromCache);
    const whiteList = config.file.white_list;
    const mustEnsure = (!(whiteList.includes(project.sitename)))
      && (project.visibility === PRIVATE_VISIBILITY);
    if (mustEnsure) {
      await ctx.ensurePermission(project.site_id, READ_PERMISSION);
    }
    return project;
  }

  // 验证用户是否写项目写权限，有则返回项目，没有则报错
  async getWritableProject(path, fromCache) {
    const { ctx } = this;
    path = path || ctx.params.project_path;
    const project = await this.getExistsProject(path, fromCache);
    const username = ctx.state.user.username;
    if (this.isOwner(username, path)) {
      await ctx.validateToken();
    } else {
      await ctx.ensurePermission(project.site_id, READ_WRITE_PERMISSION);
    }
    return project;
  }

  isOwner(username, path) {
    return path.startsWith(`${username}/`);
  }

  async sendMessage(project, method) {
    const { service } = this;
    const payload = this.wrapMessage(project, method);
    await service.kafka.send(payload);
  }

  // 向kafka发送消息，同步网站信息到elasticsearch
  wrapMessage(project, method) {
    const { ctx, config } = this;
    const { helper } = ctx;
    return {
      topic: config.kafka.topics.elasticsearch,
      messages: helper.projectToMessage(project, method),
      key: project._id,
    };
  }

  // 若项目存在则返回错误
  async ensureProjectNotExist(path) {
    const { service } = this;
    const project = await this.getByPath(path);
    service.common.throwIfExists(project, ERR_MSGS.projectAlreadyExist);
  }

  // 创建gitlab项目
  async createGitlabProject(account_id) {
    const { ctx, service } = this;
    const { sitename, visibility } = ctx.params;
    const project = await service.gitlab
      .createProject({ name: sitename, visibility, account_id });
    return project;
  }
}

module.exports = ProjectService;
