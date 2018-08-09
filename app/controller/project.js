'use strict';

const Controller = require('egg').Controller;
const { empty } = require('../helper');

const create_rule = {
  sitename: 'string',
  site_id: { type: 'int', required: false },
  hook_url: 'url',
  visibility: [ 'public', 'private' ],
};

const update_visibility_rule = {
  visibility: [ 'public', 'private' ],
};

class ProjectController extends Controller {
  async create() {
    this.ctx.validate(create_rule);
    const account = await this.ctx.model.Account
      .get_by_kw_username(this.ctx.params.kw_username)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (empty(account)) { this.ctx.throw(404, 'User not found'); }

    const project = await this.service.gitlab
      .create_project({
        name: this.ctx.request.body.sitename,
        visibility: this.ctx.request.body.visibility,
        hook_url: this.ctx.request.body.hook_url,
        account_id: account._id,
      }).catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(409, 'project exists');
      });

    project.sitename = this.ctx.request.body.sitename;
    project.path = `${this.ctx.params.kw_username}/${project.sitename}`;
    project.site_id = this.ctx.request.body.site_id;

    await this.ctx.model.Project
      .create(project)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    this.ctx.status = 201;
  }

  async update_visibility() {
    this.ctx.validate(update_visibility_rule);
    const project = await this.ctx.model.Project
      .get_by_path_from_db(this.ctx.params.path);
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }

    project.visibility = this.ctx.request.body.visibility;
    await this.service.gitlab
      .update_project_visibility(project._id, project.visibility)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await project.save().catch(err => {
      this.ctx.logger.error(err);
      this.ctx.throw(500);
    });

    this.ctx.body = {
      site_id: project.site_id,
      visibility: project.visibility,
    };
  }

  async remove() {
    const project = await this.ctx.model.Project
      .get_by_path(
        this.ctx.params.path,
        false
      );
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }

    await this.ctx.model.File
      .delete_sub_files_and_release_cache(project.path, null, false)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await this.service.gitlab
      .delete_project(project._id)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await this.ctx.model.Project
      .delete_and_release_cache_by_path(project.path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    this.ctx.status = 204;
  }
}

module.exports = ProjectController;
