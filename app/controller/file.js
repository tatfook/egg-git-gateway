'use strict';

const Controller = require('egg').Controller;
const { empty } = require('../helper');

class FileController extends Controller {
  async show() {
    const path = decodeURI(this.ctx.params.path);
    let file = await this.ctx.model.File
      .get_by_path(path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    if (empty(file)) {
      file = await this.load_from_gitlab(path);
    }
    this.ctx.body = { content: file.content };
  }

  async dump() {
    const file = await this.load_from_gitlab(this.ctx.params.path, false);
    this.ctx.body = { content: file.content };
  }

  async load_from_gitlab(path, decoded = true) {
    if (!decoded) { path = decodeURI(this.ctx.params.path); }
    const project_path_pattern = /^[^\/]+\/[^\/]+/;
    const project_path = path.match(project_path_pattern)[0];
    const project = await this.ctx.model.Project
      .get_by_path(project_path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }

    const path_without_namespace = path.replace(`${project_path}`, '');
    const file = await this.service.gitlab
      .load_file(project._id, path_without_namespace)
      .catch(err => {
        this.ctx.logger.error(err);
        if (err.response.status === 404) {
          this.ctx.throw(404, 'File not found');
        }
        this.ctx.throw(500);
      });
    if (empty(file)) { this.ctx.throw(404, 'File not found'); }

    file.path = path;
    await this.ctx.model.File.create(file)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    return file;
  }
}

module.exports = FileController;
