'use strict';

const Controller = require('egg').Controller;
const { empty } = require('../helper');

const create_rule = {
  branch: { type: 'string', default: 'master' },
  content: { type: 'string', required: false },
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
  },
};

class FileController extends Controller {
  async show() {
    const path = this.ctx.params.path;
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

    this.throw_if_not_exist(file);
    this.ctx.body = { content: file.content };
  }

  async create() {
    this.ctx.validate(create_rule);
  }

  async update() { return ''; }
  async remove() { return ''; }
  async move() { return ''; }
  async rename() { return ''; }

  async dump() {
    const file = await this.load_from_gitlab(this.ctx.params.path, false);
    this.ctx.body = { content: file.content };
  }

  get_project_path(path) {
    const project_path_pattern = /^[^\/]+\/[^\/]+/;
    const project_path = path.match(project_path_pattern)[0];
    return project_path;
  }

  get_path_without_namespace(path) {
    const name_space_pattern = /^[^\/]+\/[^\/]+\//;
    const path_without_namespace = path.replace(`${name_space_pattern}`, '');
    return path_without_namespace;
  }

  filter_file_or_folder(file) {
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
      .load_file(project._id, this.get_path_without_namespace(path))
      .catch(err => {
        this.ctx.logger.error(err);
        if (err.response.status === 404) {
          this.throw_if_not_exist();
        }
        this.ctx.throw(500);
      });
    this.throw_if_not_exist(file);

    file.path = path;
    file = this.filter_file_or_folder(file);
    await this.ctx.model.File.create(file)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    return file;
  }

  throw_if_not_exist(file) {
    const errMsg = 'File not found';
    if (empty(file)) { this.ctx.throw(404, errMsg); }
    if (file.status === 'deleted' || file.type === 'tree') { this.ctx.throw(404, errMsg); }
  }

  async get_project() {
    const path = this.ctx.params.path;
    const project = await this.ctx.model.Project
      .get_by_path(this.get_project_path(path))
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }
    return project;
  }

  async get_readable_project() {
    const project = await this.get_project();
    const white_list = this.config.file.white_list;
    if (white_list.includes(project.sitename)) {
      await this.ctx.ensurePermission(project.site_id, 'r');
    }
    return project;
  }

  async get_writable_project() {
    const project = await this.get_project();
    await this.ctx.ensurePermission(project.site_id, 'rw');
    return project;
  }
}

module.exports = FileController;
