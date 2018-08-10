'use strict';

const Controller = require('egg').Controller;
const { empty } = require('../helper');

const file_type = {
  tree: 'Folder',
  blob: 'File',
};

class NodeController extends Controller {
  async send_message(commit_id, project_id) {
    await this.service.kafka
      .send_commit_message(commit_id, project_id)
      .catch(err => {
        this.ctx.logger.error(err);
      });
  }

  get_file_name(path) {
    path = path || this.ctx.params.path;
    return this.ctx.model.File.get_file_name(path);
  }

  get_project_path(path) {
    path = path || this.ctx.params.path;
    return this.ctx.model.File.get_project_path(path);
  }

  filter_file_or_folder(file) {
    const is_folder = (file.name === '.gitignore.md' || file.name === '.gitkeep');
    if (is_folder) {
      return {
        name: file.path.match(/[^\/]+$/)[0],
        type: 'tree',
        path: file.path.replace(`/${file.name}`, ''),
      };
    }
    file.type = 'blob';
    return file;
  }

  validate_file_path(path) {
    path = path || this.ctx.params.path;
    const pattern = /\.[^\.]+$/;
    if (!pattern.test(path)) { this.ctx.throw(400, 'Path of the file must end with .xxx'); }
  }

  throw_if_not_exist(file, type = 'blob') {
    const errMsg = `${file_type[type]} not found`;
    if (empty(file)) { this.ctx.throw(404, errMsg); }
    if (file.type !== type) { this.ctx.throw(404, errMsg); }
  }

  throw_if_exists(file) {
    if (!empty(file)) { this.ctx.throw(409); }
  }

  async throw_if_can_not_move() {
    this.throw_if_not_inside_the_same_project();
    await this.throw_if_file_in_target_file_exist();
    await this.throw_if_parent_node_not_exist();
  }

  throw_if_not_inside_the_same_project() {
    const new_path = this.ctx.params.path;
    const previous_path = this.ctx.request.body.previous_path;
    const project_of_new_path = this.get_project_path(new_path);
    const project_of_previous_path = this.get_project_path(previous_path);
    const inside_the_same_project = (project_of_new_path === project_of_previous_path);
    if (!inside_the_same_project) {
      const errMsg = 'Can only move inside the same project';
      this.ctx.throw(400, errMsg);
    }
  }

  async throw_if_file_in_target_file_exist() {
    const file_in_target_path = await this.ctx.model.File
      .get_by_path(this.ctx.params.path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    this.throw_if_exists(file_in_target_path);
  }

  async throw_if_parent_node_not_exist() {
    const errMsg = await this.ctx.model.File
      .ensure_parent_exist(this.ctx.params.path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (errMsg) { this.ctx.throw(404, errMsg); }
  }

  async get_project(project_path) {
    project_path = project_path || this.get_project_path();
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
    const project = await this.get_project(project_path);
    await this.ctx.ensurePermission(project.site_id, 'rw');
    return project;
  }
}

module.exports = NodeController;
