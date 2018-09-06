'use strict';

const Controller = require('../core/base_controller');
const { empty } = require('../lib/helper');

const file_type = {
  tree: 'Folder',
  blob: 'File',
};

class NodeController extends Controller {
  async send_message(commit_id, project_id, es_message) {
    const wrapped_commit_message = this.service.kafka
      .wrap_commit_message(commit_id, project_id);
    const payloads = [ wrapped_commit_message ];
    if (es_message) {
      const wrapped_es_message = this.service.kafka
        .wrap_elasticsearch_message(es_message, project_id);
      payloads.push(wrapped_es_message);
    }
    await this.service.kafka.send(payloads)
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
    file.type = file.type || 'blob';
    if (file.type !== type) { this.ctx.throw(404, errMsg); }
  }

  throw_if_exists(file) {
    if (!empty(file)) { this.ctx.throw(409); }
  }

  async throw_if_can_not_move(project_id) {
    await this.throw_if_target_file_exist(project_id);
    await this.throw_if_parent_node_not_exist(project_id);
  }

  async throw_if_target_file_exist(project_id) {
    const file_in_target_path = await this.ctx.model.File
      .get_by_path(project_id, this.ctx.params.path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    this.throw_if_exists(file_in_target_path);
  }

  async throw_if_parent_node_not_exist(project_id) {
    const errMsg = await this.ctx.model.File
      .ensure_parent_exist(project_id, this.ctx.params.path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (errMsg) { this.ctx.throw(404, errMsg); }
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
