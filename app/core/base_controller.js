'use strict';

const Controller = require('egg').Controller;
const { empty } = require('../lib/helper');

class Base_controllerController extends Controller {
  async get_account(query) {
    const account = await this.ctx.model.Account
      .get_by_query(query)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    return account;
  }

  async get_existing_account(query) {
    const account = await this.get_account(query);
    this.throw_if_not_exist(account, 'Account not found');
    return account;
  }

  async get_project(project_path, from_cache) {
    project_path = project_path || this.ctx.params.project_path;
    const project = await this.ctx.model.Project
      .get_by_path(project_path, from_cache)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    return project;
  }

  async get_existing_project(project_path, from_cache) {
    const project = await this.get_project(project_path, from_cache);
    this.throw_if_not_exist(project, 'Project not found');
    return project;
  }

  throw_if_exists(object, errMsg) {
    if (!empty(object)) { this.ctx.throw(409, errMsg); }
  }

  throw_if_not_exist(object, errMsg) {
    if (empty(object)) { this.ctx.throw(404, errMsg); }
  }

  success(action = 'success') {
    this.ctx.body = {};
    this.ctx.body[action] = true;
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
