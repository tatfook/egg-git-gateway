'use strict';

const Controller = require('../core/base_controller');

class NodeController extends Controller {
  async clear_project() {
    const { ctx } = this;
    ctx.ensureAdmin();
    const project = await this.get_project();
    await ctx.model.Node
      .deleteProject(project._id)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
    this.deleted();
  }

  wrapMessage(message) {
    const { ctx } = this;
    const { helper } = ctx;
    const key = message.project_id;
    const topics = this.config.kafka.topics;
    const git_message = {
      messages: message._id,
      topic: topics.commit,
      key,
    };
    const es_message = {
      messages: helper.commitToMessage(message),
      topic: topics.elasticsearch,
      key,
    };
    return [ git_message, es_message ];
  }

  async sendMessage(message) {
    const { ctx, service } = this;
    const payloads = this.wrapMessage(message);
    await service.kafka.send(payloads)
      .catch(err => {
        ctx.logger.error(err);
      });
  }

  getFileName(path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    return ctx.model.Node.getFileName(path);
  }

  async get_node(project_id, path, from_cache) {
    const { ctx } = this;
    path = path || ctx.params.path;
    const node = await ctx.model.Node
      .getByPath(project_id, path, from_cache)
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

  async ensureParentExist(account_id, project_id, path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    await ctx.model.Node
      .ensureParentExist(account_id, project_id, path)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
  }

  get_message_options(project) {
    const { ctx } = this;
    const { commit_message, source_version, encoding } = ctx.params;
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
