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

  throw_if_exists(file, message) {
    if (!empty(file)) { this.ctx.throw(409, message); }
  }

  ensure_unique(files) {
    const exist_paths = {};
    const errMsg = 'Reduplicative files exist in your request';
    for (const file of files) {
      if (exist_paths[file.path]) { this.ctx.throw(409, errMsg); }
      exist_paths[file.path] = true;
    }
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

  async throw_if_nodes_exist(project_id, files) {
    for (const file of files) {
      const node = await this.ctx.model.Node
        .get_by_path_from_db(project_id, file.path)
        .catch(err => {
          this.ctx.logger.error(err);
          this.ctx.throw(500);
        });
      if (!empty(node)) { this.ctx.throw(409, `${file.path} already exists`); }
    }
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

  async ensure_parents_exist(account_id, project_id, files) {
    for (const file of files) {
      await this.ctx.model.Node.ensure_parent_exist(account_id, project_id, file.path)
        .catch(err => {
          this.ctx.logger.error(err);
          this.ctx.throw(500);
        });
    }
  }
}

module.exports = NodeController;
