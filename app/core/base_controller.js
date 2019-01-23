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
