'use strict';

const Controller = require('egg').Controller;
const { empty } = require('../helper');

const create_rule = {
  sitename: 'string',
  site_id: { type: 'int', required: false },
  visibility: [ 'public', 'private' ],
};

const update_visibility_rule = {
  visibility: [ 'public', 'private' ],
};

class ProjectController extends Controller {
  async create() {
    this.ctx.ensureAdmin();
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
    this.ctx.ensureAdmin();
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

    const es_message = {
      action: 'update_site_visibility',
      path: project.path,
      visibility: project.visibility,
    };
    await this.send_message(project._id, es_message);

    this.ctx.body = {
      site_id: project.site_id,
      visibility: project.visibility,
    };
  }

  async remove() {
    this.ctx.ensureAdmin();
    const project = await this.ctx.model.Project
      .get_by_path(
        this.ctx.params.path,
        false
      );
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }

    await this.ctx.model.File
      .delete_project(project._id)
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
      .delete_and_release_cache(project.path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    const es_message = {
      action: 'remove_site',
      path: project.path,
    };
    await this.send_message(project._id, es_message);

    this.ctx.status = 204;
  }

  async send_message(project_id, es_message) {
    const wrapped_es_message = this.service.kafka
      .wrap_elasticsearch_message(es_message, project_id);
    await this.service.kafka.send(wrapped_es_message)
      .catch(err => {
        this.ctx.logger.error(err);
      });
  }
}

module.exports = ProjectController;
