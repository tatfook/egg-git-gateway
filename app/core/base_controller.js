'use strict';

const Controller = require('egg').Controller;
const { empty } = require('../lib/helper');

class Base_controllerController extends Controller {
  async get_account(_id) {
    const account = await this.ctx.model.Account
      .findOne({ _id })
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (empty(account)) { this.ctx.throw(404, 'Account not found'); }
    return account;
  }

  own_this_project(username, project_path) {
    return project_path.startsWith(`${username}/`);
  }

  async get_project(project_path) {
    project_path = project_path || this.ctx.params.project_path;
    const project = await this.ctx.model.Project
      .get_by_path(project_path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }
    return project;
  }

  async get_readable_project(project_path) {
    project_path = project_path || this.ctx.params.project_path;
    const project = await this.get_project(project_path);
    const white_list = this.config.file.white_list;
    const must_ensure = (!(white_list.includes(project.sitename)))
      && (project.visibility === 'private');
    if (must_ensure) {
      await this.ctx.ensurePermission(project.site_id, 'r');
    }
    return project;
  }

  async get_writable_project(project_path) {
    project_path = project_path || this.ctx.params.project_path;
    const project = await this.get_project(project_path);
    if (!this.own_this_project(this.ctx.state.user.username, project_path)) {
      await this.ctx.ensurePermission(project.site_id, 'rw');
    }
    return project;
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
