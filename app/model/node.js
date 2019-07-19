'use strict';

const assert = require('assert');
const _ = require('lodash');
const Helper = require('../lib/helper');

const PENDING_TIP = 'pending';
const FOLDER_TYPE = 'tree';

const deserializeTree = serilized_tree => {
  return JSON.parse(serilized_tree);
};

module.exports = app => {
  const redis = app.redis;
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const logger = app.logger;
  const cache_expire = app.config.cache_expire;

  let Model;

  const CommitSchema = new Schema({
    commit_id: String,
    short_id: String,
    version: Number,
    author_name: String,
    source_version: Number,
    message: String,
  }, { timestamps: true });

  const LastCommitSchema = new Schema({
    version: Number,
    source_version: Number,
    author_name: String,
    message: String,
  }, { timestamps: true });

  const NodeSchema = new Schema({
    name: String,
    path: String,
    content: String,
    type: { type: String, default: 'blob' },
    project_id: Number,
    account_id: Number,
    commits: [ CommitSchema ],
    latest_commit: LastCommitSchema,
  }, { timestamps: true });

  NodeSchema.index({ project_id: 1, path: 1 });
  const CommitModel = mongoose.model('Commit', CommitSchema);

  const methods = NodeSchema.methods;

  methods.createCommit = function(info) {
    if (this.type === FOLDER_TYPE) return;
    this.commits = this.commits || [];
    const lastCommit = this.latest_commit || {};
    if (_.isEmpty(lastCommit) && !info.new) return;
    let baseInfo = {
      version: (lastCommit.version || 0) + 1,
      commit_id: PENDING_TIP,
      short_id: PENDING_TIP,
    };
    baseInfo = Object.assign(baseInfo, info);
    const commit = new CommitModel(baseInfo);
    this.latest_commit = commit;
    this.commits.push(commit);
    return this;
  };

  const statics = NodeSchema.statics;

  NodeSchema.virtual('tree_path').get(function() {
    const path = this.previous_path || this.path;
    const name = this.previous_name || this.name;
    return statics.getTreePath(path, name);
  });

  statics.getFileName = function(path) {
    const file_name_pattern = /[^\/]+$/;
    const file_name = path.match(file_name_pattern)[0];
    return file_name;
  };

  statics.getTreePath = function(path, file_name) {
    if (!file_name) { file_name = this.getFileName(path); }
    const file_name_pattern = new RegExp(`/${file_name}$`, 'u');
    const tree_path = path.replace(file_name_pattern, '');
    return tree_path;
  };

  statics.cache = function(file, pipeline = redis.pipeline()) {
    assert(file.project_id);
    assert(file.path);
    this.cacheContent(file, pipeline);
    return pipeline;
  };

  statics.releaseCache = function(file, pipeline = redis.pipeline()) {
    assert(file.project_id);
    assert(file.path);
    this.releaseContentCache(file, pipeline);
    this.releaseTreeCache(file, pipeline);
    return pipeline;
  };

  statics.cacheContent = function(file, pipeline = redis.pipeline()) {
    const key = Helper.generateFileKey(file.project_id, file.path);
    pipeline.setex(key, cache_expire, Helper.serilizeFile(file));
  };

  statics.releaseContentCache = function(file, pipeline = redis.pipeline()) {
    const path = file.previous_path || file.path;
    const key = Helper.generateFileKey(file.project_id, path);
    pipeline.del(key);
  };

  statics.loadContentCacheByPath = async function(project_id, path) {
    const key = Helper.generateFileKey(project_id, path);
    const project = await redis.get(key);
    return JSON.parse(project);
  };

  statics.cacheTree = function(project_id, path, tree, pipeline = redis.pipeline()) {
    const key = Helper.generateTreeKey(project_id, path);
    pipeline.setex(key, cache_expire, Helper.serilizeTree(tree));
    return pipeline;
  };

  statics.loadTreeCacheByPath = async function(project_id, path) {
    const key = Helper.generateTreeKey(project_id, path);
    const serilized_tree = await redis.get(key);
    return deserializeTree(serilized_tree);
  };

  statics.releaseTreeCache = function(file, pipeline = redis.pipeline()) {
    const key = Helper.generateTreeKey(file.project_id, file.tree_path);
    pipeline.del(key);
    return pipeline;
  };

  statics.releaseMultiFileCache = function(files, project_id, pipeline = redis.pipeline()) {
    const keys_to_release = [];
    for (const file of files) {
      file.project_id = file.project_id || project_id;
      const file_key = Helper.generateFileKey(
        file.project_id || project_id,
        file.previous_path || file.path
      );
      keys_to_release.push(file_key);

      if (file.type === FOLDER_TYPE) {
        const tree_key = Helper.generateTreeKey(
          file.project_id || project_id,
          file.previous_path || file.path
        );
        keys_to_release.push(tree_key);
      }
    }
    pipeline.del(keys_to_release);
    return pipeline;
  };

  statics.getByPathFromDB = async function(project_id, path) {
    const file = await this.findOne({ project_id, path });
    if (file) {
      const pipeline = this.cache(file);
      await pipeline.exec();
      return file;
    }
  };

  statics.getByPath = async function(project_id, path, from_cache = true) {
    let file;
    if (from_cache) {
      file = await this.loadContentCacheByPath(project_id, path);
      if (!_.isEmpty(file)) { return file; }
    }
    file = await this.getByPathFromDB(project_id, path);
    return file;
  };

  statics.getCommits = async function(project_id, path, skip = 0, limit = 20) {
    const node = await this.findOne({ project_id, path });
    node.commits = node.commits.reverse().slice(skip, skip + limit);
    return node;
  };

  statics.move = async function(file) {
    const pipeline = this.releaseCache(file);
    await pipeline.exec();
    await file.save();
  };

  statics.deleteAndReleaseCache = async function(file) {
    const pipeline = this.releaseCache(file);
    await pipeline.exec();

    const path = file.path;
    await this.deleteOne({ path });
  };

  statics.getTreeByPathFromDB = async function(
    project_id, path, recursive = false, pagination) {
    let query_condition;
    if (path) {
      const path_pattern = recursive ? `^${path}\/` : `^${path}\/[^\/]+$`;
      query_condition = { project_id, path: new RegExp(path_pattern, 'u') };
    } else {
      query_condition = { project_id };
    }

    const selected_fields = '_id name path type';
    const tree = await this.find(query_condition, selected_fields)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .catch(err => { logger.error(err); });
    if (tree.length > 0 && !recursive) {
      const pipeline = this.cacheTree(project_id, path, tree);
      await pipeline.exec();
    }
    return tree;
  };

  statics.getTreeByPath = async function(
    project_id, path, from_cache = true, recursive = false, pagination) {
    let tree;
    if (!recursive) {
      pagination = { skip: 0, limit: 9999999 };
      if (from_cache) {
        tree = await this.loadTreeCacheByPath(project_id, path);
      }
    }
    if (_.isEmpty(tree)) {
      tree = await this.getTreeByPathFromDB(project_id, path, recursive, pagination);
    }
    return tree;
  };

  statics.getNodeAncestors = async function(
    account_id, project_id, ancestors_to_create = {},
    ancestors_already_exist = {}, node) {
    let path = node.path;
    const ancestor_names = path.split('/');
    let node_name = ancestor_names[ancestor_names.length - 1];
    for (let i = ancestor_names.length - 2; i >= 0; i--) {
      path = this.getTreePath(path, node_name);
      node_name = ancestor_names[i];
      if (ancestors_to_create[path] || ancestors_already_exist[path]) { continue; }
      const parent = await this.getByPathFromDB(project_id, path);
      if (_.isEmpty(parent)) {
        ancestors_to_create[path] = {
          name: node_name,
          type: FOLDER_TYPE,
          path,
          project_id,
          account_id,
        };
      } else {
        ancestors_already_exist[path] = true;
      }
    }
  };

  statics.getParentsNotExist = async function(account_id, project_id, nodes) {
    const ancestors_to_create = {};
    const ancestors_already_exist = {};
    if (!(nodes instanceof Array)) { nodes = [{ path: nodes }]; }
    for (const node of nodes) {
      await this.getNodeAncestors(
        account_id,
        project_id,
        ancestors_to_create,
        ancestors_already_exist,
        node
      );
    }
    return Object.values(ancestors_to_create);
  };

  statics.ensureParentExist = async function(account_id, project_id, path) {
    const ancestors_to_create = await this
      .getParentsNotExist(account_id, project_id, path);
    if (ancestors_to_create.length > 0) await this.create(ancestors_to_create);
  };

  statics.getSubfilesByPath = async function(project_id, tree_path, pattern, get_self = true) {
    if (!pattern) { pattern = new RegExp(`^${tree_path}/.*`, 'u'); }
    const subfiles = await this.find({ project_id, path: pattern })
      .limit(999999);

    if (get_self) {
      const folder = await this.findOne({ project_id, path: tree_path });
      subfiles.push(folder);
    }
    return subfiles;
  };

  statics.deleteSubfilesAndReleaseCache =
  async function(project_id, tree_path, subfiles, remove_self = true) {
    const pattern = new RegExp(`^${tree_path}/.*`, 'u');
    if (!subfiles) {
      subfiles = await this.getSubfilesByPath(project_id, tree_path, pattern, remove_self);
    }
    if (_.isEmpty(subfiles)) { return; }

    const pipeline = this.releaseMultiFileCache(subfiles, project_id);
    await pipeline.exec();
    await this.deleteMany({ project_id, path: pattern });

    if (remove_self) {
      const folder = subfiles[subfiles.length - 1];
      if (!_.isEmpty(folder)) await folder.remove();
    }
  };

  statics.deleteAndReleaseByQuery = async function(query) {
    const files = await this.find(query).limit(99999999);
    if (_.isEmpty(files)) { return; }
    const pipeline = await this.releaseMultiFileCache(files);
    await pipeline.exec();
    await this.deleteMany(query);
  };

  statics.deleteProject = async function(project_id) {
    assert(project_id);
    await this.deleteAndReleaseByQuery({ project_id });
  };

  statics.deleteAccount = async function(account_id) {
    assert(account_id);
    await this.deleteAndReleaseByQuery({ account_id });
  };

  NodeSchema.post('save', async function(file) {
    const pipeline = statics.releaseCache(file);
    await pipeline.exec()
      .catch(err => {
        logger.error(err);
        throw err;
      });
  });

  statics.createAndCommit = async function(info, ...files) {
    const instances = files.map(file => {
      const instance = new Model(file);
      instance.createCommit(info);
      return instance;
    });
    return await this.create(instances);
  };

  Model = mongoose.model('Node', NodeSchema);
  return Model;
};
