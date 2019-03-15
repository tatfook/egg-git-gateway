'use strict';

const Controller = require('egg').Controller;

class Base_controllerController extends Controller {
  async getAccount(query) {
    const { ctx } = this;
    const account = await ctx.model.Account
      .findOne(query)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
    return account;
  }

  async getExistsAccount(query) {
    const account = await this.getAccount(query);
    this.throwIfNotExist(account, 'Account not found');
    return account;
  }

  async getProject(project_path, from_cache) {
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

  async getExistsProject(project_path, from_cache) {
    const project = await this.getProject(project_path, from_cache);
    this.throwIfNotExist(project, 'Project not found');
    return project;
  }

  throwIfExists(object, errMsg) {
    const { ctx } = this;
    if (!ctx.helper.empty(object)) { ctx.throw(409, errMsg); }
  }

  throwIfNotExist(object, errMsg) {
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

  error(err) {
    const { ctx } = this;
    ctx.error(err);
    ctx.throw(err);
  }
}

module.exports = Base_controllerController;
