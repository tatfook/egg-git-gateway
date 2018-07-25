'use strict';

const Controller = require('egg').Controller;
const { empty } = require('../helper');

class FileController extends Controller {
  async show() {
    const path = decodeURI(this.ctx.params.path);
    const from_cache = !this.ctx.query.refresh_cache;
    let file = await this.ctx.model.File
      .get_by_path(path, from_cache)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    if (empty(file)) {
      file = await this.load_from_gitlab(path);
    }

    this.throw_404_if_not_exist(file);
    this.ctx.body = { content: file.content };
  }

  async dump() {
    const file = await this.load_from_gitlab(this.ctx.params.path, false);
    this.ctx.body = { content: file.content };
  }

  get_project_path(path) {
    const project_path_pattern = /^[^\/]+\/[^\/]+/;
    const project_path = path.match(project_path_pattern)[0];
    return project_path;
  }

  get_file_git_path_without_namespace(path) {
    const to_replace = /^[^\/]+\/[^\/]+\//;
    const file_git_path_without_namespace = path.replace(`${to_replace}`, '');
    return file_git_path_without_namespace;
  }

  wrap(file) {
    file.type = 'blob';
    if (file.name === '.gitignore.md' || file.name === '.gitkeep') {
      return {
        name: file.path.match(/[^\/]+$/)[0],
        type: 'tree',
        path: file.path.replace(`/${file.name}`, ''),
      };
    }
    return file;
  }

  async load_from_gitlab(path) {
    const project = await this.ctx.model.Project
      .get_by_path(this.get_project_path(path))
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }

    let file = await this.service.gitlab
      .load_file(project._id, this.get_file_git_path_without_namespace(path))
      .catch(err => {
        this.ctx.logger.error(err);
        if (err.response.status === 404) {
          this.throw_404_if_not_exist();
        }
        this.ctx.throw(500);
      });
    this.throw_404_if_not_exist(file);

    file.path = path;
    file = this.wrap(file);
    await this.ctx.model.File.create(file)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    return file;
  }

  throw_404_if_not_exist(file) {
    const errMsg = 'File not found';
    if (empty(file)) { this.ctx.throw(404, errMsg); }
    if (file.status === 'deleted' || file.type === 'tree') { this.ctx.throw(404, errMsg); }
  }
}

module.exports = FileController;
