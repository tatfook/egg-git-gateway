'use strict';

const Controller = require('egg').Controller;

class Base_controllerController extends Controller {
  async get_account(query) {
    const { ctx } = this;
    const account = await ctx.model.Account
      .get_by_query(query)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
    return account;
  }

  async get_existing_account(query) {
    const account = await this.get_account(query);
    this.throw_if_not_exist(account, 'Account not found');
    return account;
  }

  async get_project(project_path, from_cache) {
    const { ctx } = this;
    project_path = project_path || ctx.params.project_path;
    const project = await ctx.model.Project
      .get_by_path(project_path, from_cache)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
    return project;
  }

  async get_existing_project(project_path, from_cache) {
    const project = await this.get_project(project_path, from_cache);
    this.throw_if_not_exist(project, 'Project not found');
    return project;
  }

  async get_readable_project(project_path, from_cache) {
    const { ctx, config } = this;
    project_path = project_path || ctx.params.project_path;
    const project = await this.get_existing_project(project_path, from_cache);
    const white_list = config.file.white_list;
    const must_ensure = (!(white_list.includes(project.sitename)))
      && (project.visibility === 'private');
    if (must_ensure) {
      await ctx.ensurePermission(project.site_id, 'r');
    }
    return project;
  }

  async get_writable_project(project_path, from_cache) {
    const { ctx } = this;
    project_path = project_path || ctx.params.project_path;
    const project = await this.get_existing_project(project_path, from_cache);
    if (!this.own_this_project(ctx.state.user.username, project_path)) {
      await ctx.ensurePermission(project.site_id, 'rw');
    }
    return project;
  }

  own_this_project(username, project_path) {
    return project_path.startsWith(`${username}/`);
  }

  throw_if_exists(object, errMsg) {
    const { ctx } = this;
    if (!ctx.helper.empty(object)) { ctx.throw(409, errMsg); }
  }

  throw_if_not_exist(object, errMsg) {
    const { ctx } = this;
    if (ctx.helper.empty(object)) { ctx.throw(404, errMsg); }
  }

  success(action = 'success') {
    this.ctx.body = { [action]: true };
  }

  created() {
    this.ctx.status = 201;
    this.success('created');
  }

  updated() {
    this.success('updated');
  }

  deleted() {
    this.success('deleted');
  }

  moved() {
    this.success('moved');
  }
}

module.exports = Base_controllerController;
