'use strict';

const Controller = require('egg').Controller;
const { empty } = require('../helper');

const create_rule = {
  site_id: 'int',
  name: 'string',
  hook_url: 'url',
  visibility: [ 'public', 'private' ],
};

class ProjectController extends Controller {
  async create() {
    this.ctx.validate(create_rule);
    const account = await this.ctx.model.Account
      .get_by_user_id(this.ctx.params.user_id)
      .catch(err => {
        this.ctx.logger.error(err);
      });
    if (empty(account)) { this.ctx.throw(404, 'User not found'); }

    console.log(account);
    const project = await this.ctx.service.gitlab
      .create_project({
        name: this.ctx.request.body.name,
        visibility: this.ctx.request.body.visibility,
        hook_url: this.ctx.request.body.hook_url,
        account_id: account._id,
      }).catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(409, 'project exists');
      });
    await this.ctx.model.Project
      .create(project)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    this.ctx.status = 201;
  }

  // todo
  // async update_visibility() {

  // }

  async load_from_git() {
    const project_id = this.ctx.params.id;
    const project = await this.ctx.service.gitlab
      .load_project(project_id)
      .catch(err => {
        this.ctx.logger.error(err.response.status);
      });

    if (empty(project)) {
      this.ctx.throw(404, 'Project not found');
    }

    project.site_id = this.ctx.request.body.site_id;
    await this.ctx.model.Project.create(project)
      .catch(err => {
        this.ctx.logger.error(err);
      });
    this.ctx.status = 204;
  }
}

module.exports = ProjectController;
