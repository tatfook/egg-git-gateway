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
    return this.ctx.model.Node.get_file_name(path);
  }

  get_project_path(path) {
    path = path || this.ctx.params.path;
    return this.ctx.model.Node.get_project_path(path);
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

  own_this_project(username, project_path) {
    return project_path.startsWith(`${username}/`);
  }

  async throw_if_node_exist(project_id, path) {
    path = path || this.ctx.params.path;
    const node = await this.ctx.model.Node
      .get_by_path_from_db(project_id, path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    this.throw_if_exists(node);
  }

  async ensure_parent_exist(account_id, project_id, path) {
    path = path || this.ctx.params.path;
    await this.ctx.model.Node
      .ensure_parent_exist(account_id, project_id, path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
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

}

module.exports = NodeController;
