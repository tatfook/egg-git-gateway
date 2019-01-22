'use strict';

const Controller = require('../core/base_controller');

class NodeController extends Controller {
  async get_readable_project(project_path, from_cache) {
    project_path = project_path || this.ctx.params.project_path;
    const project = await this.get_existing_project(project_path, from_cache);
    const white_list = this.config.file.white_list;
    const must_ensure = (!(white_list.includes(project.sitename)))
      && (project.visibility === 'private');
    if (must_ensure) {
      await this.ctx.ensurePermission(project.site_id, 'r');
    }
    return project;
  }

  async get_writable_project(project_path, from_cache) {
    project_path = project_path || this.ctx.params.project_path;
    const project = await this.get_existing_project(project_path, from_cache);
    if (!this.own_this_project(this.ctx.state.user.username, project_path)) {
      await this.ctx.ensurePermission(project.site_id, 'rw');
    }
    return project;
  }

  own_this_project(username, project_path) {
    return project_path.startsWith(`${username}/`);
  }

  async clear_project() {
    this.ctx.ensureAdmin();
    const project = await this.get_project();
    await this.ctx.model.Node
      .delete_project(project._id)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    this.deleted();
  }

  wrap_message(commit) {
    const { helper } = this.ctx;
    const key = commit.project_id;
    const topics = this.config.kafka.topics;
    const git_message = {
      messages: commit._id,
      topic: topics.commit,
      key,
    };
    const es_message = {
      messages: helper.commit_to_message(commit),
      topic: topics.elasticsearch,
      key,
    };
    return [ git_message, es_message ];
  }

  async send_message(commit) {
    const payloads = this.wrap_message(commit);
    await this.service.kafka.send(payloads)
      .catch(err => {
        this.ctx.logger.error(err);
      });
  }

  get_file_name(path) {
    path = path || this.ctx.params.path;
    return this.ctx.model.Node.get_file_name(path);
  }

  validate_file_path(path) {
    path = path || this.ctx.params.path;
    const pattern = /\.[^\.]+$/;
    if (!pattern.test(path)) { this.ctx.throw(400, 'Path of the file must end with .xxx'); }
  }

  async get_node(project_id, path, from_cache) {
    path = path || this.ctx.params.path;
    const node = await this.ctx.model.Node
      .get_by_path(project_id, path, from_cache)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    return node;
  }

  async get_existing_node(project_id, path, from_cache) {
    const node = await this.get_node(project_id, path, from_cache);
    this.throw_if_node_not_exist(node);
    return node;
  }

  throw_if_node_not_exist(node) {
    this.throw_if_not_exist(node, 'File or folder not found');
  }

  throw_if_node_exists(node) {
    this.throw_if_exists(node, 'File or folder already exists');
  }

  async ensure_node_not_exist(project_id, path, from_cache) {
    const node = await this.get_node(project_id, path, from_cache);
    this.throw_if_node_exists(node);
    return node;
  }

  async ensure_nodes_not_exist(project_id, files, from_cache) {
    for (const file of files) {
      await this.ensure_node_not_exist(project_id, file.path, from_cache);
    }
  }

  ensure_unique(files) {
    const exist_paths = {};
    const errMsg = 'Reduplicative files exist in your request';
    for (const file of files) {
      if (exist_paths[file.path]) { this.ctx.throw(409, errMsg); }
      exist_paths[file.path] = true;
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
      await this.ctx.model.Node.ensure_parent_exist(account_id, project_id, file.path);
    }
  }

  get_commit_options(project) {
    const { ctx } = this;
    return {
      commit_message: ctx.request.body.commit_message,
      encoding: ctx.request.body.encoding,
      author: ctx.state.user.username,
      visibility: project.visibility,
    };
  }
}

module.exports = NodeController;
