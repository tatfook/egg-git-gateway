'use strict';

const Controller = require('../core/base_controller');

class NodeController extends Controller {
  async clear_project() {
    const { ctx } = this;
    ctx.ensureAdmin();
    const project = await this.get_project();
    await ctx.model.Node
      .delete_project(project._id)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
    this.deleted();
  }

  wrap_message(commit) {
    const { ctx } = this;
    const { helper } = ctx;
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
    const { ctx, service } = this;
    const payloads = this.wrap_message(commit);
    await service.kafka.send(payloads)
      .catch(err => {
        ctx.logger.error(err);
      });
  }

  get_file_name(path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    return ctx.model.Node.get_file_name(path);
  }

  validate_file_path(path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    const pattern = /\.[^\.]+$/;
    if (!pattern.test(path)) { ctx.throw(400, 'Path of the file must end with .xxx'); }
  }

  async get_node(project_id, path, from_cache) {
    const { ctx } = this;
    path = path || ctx.params.path;
    const node = await ctx.model.Node
      .get_by_path(project_id, path, from_cache)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
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
    const { ctx } = this;
    const exist_paths = {};
    const errMsg = 'Reduplicative files exist in your request';
    for (const file of files) {
      if (exist_paths[file.path]) { ctx.throw(409, errMsg); }
      exist_paths[file.path] = true;
    }
  }

  async ensure_parent_exist(account_id, project_id, path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    await ctx.model.Node
      .ensure_parent_exist(account_id, project_id, path)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
  }

  async ensure_parents_exist(account_id, project_id, files) {
    const { ctx } = this;
    for (const file of files) {
      await ctx.model.Node.ensure_parent_exist(
        account_id, project_id, file.path
      );
    }
  }

  get_commit_options(project) {
    const { ctx } = this;
    let { commit_message, source_version, encoding } = ctx.params;
    if (source_version) source_version = Number(source_version);
    return {
      source_version,
      commit_message,
      encoding,
      author: ctx.state.user.username,
      visibility: project.visibility,
    };
  }
}

module.exports = NodeController;
