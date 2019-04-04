'use strict';

const Controller = require('../core/base_controller');

const folder_type = 'tree';
const file_type = 'blob';
const invisible = 'private';
const read = 'r';
const readWrite = 'rw';
const error_msgs = {
  not_file: 'Not a file',
  not_folder: 'Not a folder',
  node_exists: 'File or folder already exists',
  not_node: 'File or folder not found',
  not_file_path: 'Path of the file must end with .xxx',
  reduplicate: 'Reduplicate files exist in your request',
};

class NodeController extends Controller {
  // check read permission if a project is invisible and not
  // in the white list
  async getReadableProject(project_path, from_cache) {
    const { ctx } = this;
    project_path = project_path || ctx.params.project_path;
    const project = await this.getExistsProject(project_path, from_cache);
    const white_list = this.config.file.white_list;
    const must_ensure = (!(white_list.includes(project.sitename)))
      && (project.visibility === invisible);
    if (must_ensure) await ctx.ensurePermission(project.site_id, read);
    return project;
  }

  // check write permission if a project is invisible and not
  // in the white list
  async getWritableProject(project_path, from_cache) {
    const { ctx } = this;
    project_path = project_path || ctx.params.project_path;
    const project = await this.getExistsProject(project_path, from_cache);
    if (!this.ownThisProject(ctx.state.user.username, project_path)) {
      await ctx.ensurePermission(project.site_id, readWrite);
    }
    return project;
  }

  ownThisProject(username, project_path) {
    return project_path.startsWith(`${username}/`);
  }

  async clearProject() {
    const { ctx } = this;
    ctx.ensureAdmin();
    const project = await this.getProject();
    await ctx.model.Node.delete_project(project._id);
    this.deleted();
  }

  // format messages that will be sent to kafka
  formatMsg(commit) {
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
      messages: helper.commit2Msg(commit),
      topic: topics.elasticsearch,
      key,
    };
    return [ git_message, es_message ];
  }

  // send messages to kafka
  async sendMsg(commit) {
    // console.log(commit);
    const { ctx, service } = this;
    const payloads = this.formatMsg(commit);
    await service.kafka.send(payloads)
      .catch(ctx.logger.error);
  }

  getNodeName(path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    return ctx.helper.getNodeName(path);
  }

  getParentPath(path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    return ctx.helper.getParentPath(path);
  }

  validateFilePath(path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    const isFilePath = ctx.helper.isFilePath(path);
    if (!isFilePath) { ctx.throw(400, error_msgs.not_file_path); }
  }

  getRepo(account, project) {
    return {
      path: project.repo_path,
      storage_name: account.storage_name,
    };
  }

  async getNode(project_id, path, from_cache) {
    const { ctx } = this;
    path = path || ctx.params.path;
    const node = await ctx.model.Node
      .getByPath(project_id, path, from_cache);
    return node;
  }

  async getExistsNode(project_id, path, from_cache) {
    const node = await this.getNode(project_id, path, from_cache);
    this.throwIfNodeNotExist(node);
    return node;
  }

  throwIfNodeNotExist(node) {
    this.throwIfNotExist(node, error_msgs.not_node);
  }

  throwIfNodeExists(node) {
    this.throwIfExists(node, error_msgs.node_exists);
  }

  throwIfNotFile(node) {
    if (node.type !== file_type) this.ctx.throw(400, error_msgs.not_file);
  }

  throwIfNotFolder(node) {
    if (node.type !== folder_type) this.ctx.throw(400, error_msgs.not_folder);
  }

  async ensureNodeNotExist(project_id, path, from_cache) {
    const node = await this.getNode(project_id, path, from_cache);
    this.throwIfNodeExists(node);
    return node;
  }

  async ensureNodesNotExist(project_id, files, from_cache = false) {
    for (const file of files) {
      await this.ensureNodeNotExist(project_id, file.path, from_cache);
    }
  }

  ensureUnique(files) {
    const { ctx } = this;
    const exist_paths = {};
    const errMsg = error_msgs.reduplicate;
    for (const file of files) {
      if (exist_paths[file.path]) { ctx.throw(409, errMsg); }
      exist_paths[file.path] = true;
    }
  }

  async ensureParentExist(account_id, project_id, path) {
    const { ctx } = this;
    path = path || ctx.params.path;
    await ctx.model.Node
      .ensureParentExist(account_id, project_id, path);
  }

  async ensureParentsExist(account_id, project_id, files) {
    const { ctx } = this;
    for (const file of files) {
      await ctx.model.Node
        .ensureParentExist(account_id, project_id, file.path);
    }
  }

  getCommitOptions(project) {
    const { ctx } = this;
    return {
      commit_message: ctx.params.commit_message,
      encoding: ctx.params.encoding,
      author: ctx.state.user.username,
      visibility: project.visibility,
    };
  }
}

module.exports = NodeController;
