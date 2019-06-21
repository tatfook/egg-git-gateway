'use strict';

const assert = require('assert');
const Helper = require('../lib/helper');

const deserialize_tree = serilized_tree => {
  return JSON.parse(serilized_tree);
};

module.exports = app => {
  const redis = app.redis;
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const logger = app.logger;
  const cache_expire = app.config.cache_expire;

  const CommitSchema = new Schema({
    commit_id: String,
    short_id: String,
    version: Number,
    author_name: String,
    source_version: Number,
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
    version: Number,
  }, { timestamps: true });

  NodeSchema.index({ project_id: 1, path: 1 });

  const statics = NodeSchema.statics;

  NodeSchema.virtual('tree_path').get(function() {
    const path = this.previous_path || this.path;
    const name = this.previous_name || this.name;
    return statics.get_tree_path(path, name);
  });

  statics.get_file_name = function(path) {
    const file_name_pattern = /[^\/]+$/;
    const file_name = path.match(file_name_pattern)[0];
    return file_name;
  };

  statics.get_tree_path = function(path, file_name) {
    if (!file_name) { file_name = this.get_file_name(path); }
    const file_name_pattern = new RegExp(`/${file_name}$`, 'u');
    const tree_path = path.replace(file_name_pattern, '');
    return tree_path;
  };

  statics.cache = function(file, pipeline = redis.pipeline()) {
    assert(file.project_id);
    assert(file.path);
    this.cache_content(file, pipeline);
    return pipeline;
  };

  statics.release_cache = function(file, pipeline = redis.pipeline()) {
    assert(file.project_id);
    assert(file.path);
    this.release_content_cache(file, pipeline);
    this.release_tree_cache(file, pipeline);
    return pipeline;
  };

  statics.cache_content = function(file, pipeline = redis.pipeline()) {
    const key = Helper.generate_file_key(file.project_id, file.path);
    pipeline.setex(key, cache_expire, Helper.serilize_file(file));
  };

  statics.release_content_cache = function(file, pipeline = redis.pipeline()) {
    const path = file.previous_path || file.path;
    const key = Helper.generate_file_key(file.project_id, path);
    pipeline.del(key);
  };

  statics.load_content_cache_by_path = async function(project_id, path) {
    const key = Helper.generate_file_key(project_id, path);
    const project = await redis.get(key)
      .catch(err => {
        logger.error(err);
      });
    return JSON.parse(project);
  };

  statics.cache_tree = function(project_id, path, tree, pipeline = redis.pipeline()) {
    const key = Helper.generate_tree_key(project_id, path);
    pipeline.setex(key, cache_expire, Helper.serilize_tree(tree));
    return pipeline;
  };

  statics.load_tree_cache_by_path = async function(project_id, path) {
    const key = Helper.generate_tree_key(project_id, path);
    const serilized_tree = await redis.get(key)
      .catch(err => {
        logger.error(err);
      });
    return deserialize_tree(serilized_tree);
  };

  statics.release_tree_cache = function(file, pipeline = redis.pipeline()) {
    const key = Helper.generate_tree_key(file.project_id, file.tree_path);
    pipeline.del(key);
    return pipeline;
  };

  statics.release_multi_files_cache = function(files, project_id, pipeline = redis.pipeline()) {
    const keys_to_release = [];
    for (const file of files) {
      file.project_id = file.project_id || project_id;
      const file_key = Helper.generate_file_key(
        file.project_id || project_id,
        file.previous_path || file.path
      );
      keys_to_release.push(file_key);

      if (file.type === 'tree') {
        const tree_key = Helper.generate_tree_key(
          file.project_id || project_id,
          file.previous_path || file.path
        );
        keys_to_release.push(tree_key);
      }
    }
    pipeline.del(keys_to_release);
    return pipeline;
  };

  statics.get_by_path_from_db = async function(project_id, path) {
    const file = await this.findOne({ project_id, path }, '-commits')
      .catch(err => { logger.error(err); });
    if (!Helper.empty(file)) {
      const pipeline = this.cache(file);
      await pipeline.exec()
        .catch(err => {
          logger.error(err);
          throw err;
        });
      return file;
    }
  };

  statics.get_by_path = async function(project_id, path, from_cache = true) {
    let file;
    if (from_cache) {
      file = await this.load_content_cache_by_path(project_id, path);
      if (!Helper.empty(file)) { return file; }
    }
    file = await this.get_by_path_from_db(project_id, path);
    return file;
  };

  statics.getCommits = async function(project_id, path, skip = 0, limit = 20) {
    const node = await this.findOne({ project_id, path });
    node.commits = node.commits.reverse().slice(skip, skip + limit);
    return node;
  };

  statics.move = async function(file) {
    const pipeline = this.release_cache(file);
    await pipeline.exec()
      .catch(err => {
        logger.error(err);
        throw err;
      });
    await file.save()
      .catch(err => {
        logger.error(err);
        throw err;
      });
  };

  statics.delete_and_release_cache = async function(file) {
    const pipeline = this.release_cache(file);
    await pipeline.exec()
      .catch(err => {
        logger.error(err);
        throw err;
      });

    const path = file.path;
    await this.deleteOne({ path })
      .catch(err => {
        logger.error(`failed to hard delete file ${path}`);
        throw err;
      });
  };

  statics.get_tree_by_path_from_db = async function(
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
      const pipeline = this.cache_tree(project_id, path, tree);
      await pipeline.exec()
        .catch(err => {
          logger.error(`failed cache tree ${path}`);
          throw err;
        });
    }
    return tree;
  };

  statics.get_tree_by_path = async function(
    project_id, path, from_cache = true, recursive = false, pagination) {
    let tree;
    if (!recursive) {
      pagination = { skip: 0, limit: 9999999 };
      if (from_cache) {
        tree = await this.load_tree_cache_by_path(project_id, path);
      }
    }
    if (Helper.empty(tree)) {
      tree = await this.get_tree_by_path_from_db(project_id, path, recursive, pagination);
    }
    return tree;
  };

  statics.get_ancestors_of_node = async function(
    account_id, project_id, ancestors_to_create = {},
    ancestors_already_exist = {}, node) {
    let path = node.path;
    const ancestor_names = path.split('/');
    let node_name = ancestor_names[ancestor_names.length - 1];
    for (let i = ancestor_names.length - 2; i >= 0; i--) {
      path = this.get_tree_path(path, node_name);
      node_name = ancestor_names[i];
      if (ancestors_to_create[path] || ancestors_already_exist[path]) { continue; }
      const parent = await this.get_by_path_from_db(project_id, path);
      if (Helper.empty(parent)) {
        ancestors_to_create[path] = {
          name: node_name,
          type: 'tree',
          path,
          project_id,
          account_id,
        };
      } else {
        ancestors_already_exist[path] = true;
      }
    }
  };

  statics.get_parents_not_exist = async function(account_id, project_id, nodes) {
    const ancestors_to_create = {};
    const ancestors_already_exist = {};
    if (!(nodes instanceof Array)) { nodes = [{ path: nodes }]; }
    for (const node of nodes) {
      await this.get_ancestors_of_node(
        account_id,
        project_id,
        ancestors_to_create,
        ancestors_already_exist,
        node
      );
    }
    return Object.values(ancestors_to_create);
  };

  statics.ensure_parent_exist = async function(account_id, project_id, path) {
    const ancestors_to_create = await this
      .get_parents_not_exist(account_id, project_id, path);
    if (ancestors_to_create.length > 0) {
      await this.create(ancestors_to_create)
        .catch(err => {
          logger.error(err);
          throw err;
        });
    }
  };

  statics.get_subfiles_by_path = async function(project_id, tree_path, pattern, get_self = true) {
    if (!pattern) { pattern = new RegExp(`^${tree_path}/.*`, 'u'); }
    const subfiles = await this.find({ project_id, path: pattern })
      .limit(999999)
      .catch(err => {
        logger.error(err);
        throw err;
      });

    if (get_self) {
      const folder = await this.findOne({ project_id, path: tree_path })
        .catch(err => {
          logger.error(err);
          throw err;
        });
      subfiles.push(folder);
    }
    return subfiles;
  };

  statics.delete_subfiles_and_release_cache =
  async function(project_id, tree_path, subfiles, remove_self = true) {
    const pattern = new RegExp(`^${tree_path}/.*`, 'u');
    if (!subfiles) {
      subfiles = await this.get_subfiles_by_path(project_id, tree_path, pattern, remove_self)
        .catch(err => {
          logger.error(err);
          throw err;
        });
    }
    if (Helper.empty(subfiles)) { return; }

    const pipeline = this.release_multi_files_cache(subfiles, project_id);
    await pipeline.exec()
      .catch(err => {
        logger.error(err);
        throw err;
      });

    await this.deleteMany({ project_id, path: pattern })
      .catch(err => {
        logger.error(err);
        throw err;
      });

    if (remove_self) {
      const folder = subfiles[subfiles.length - 1];
      if (!Helper.empty(folder)) {
        await folder.remove()
          .catch(err => {
            logger.error(err);
            throw err;
          });
      }
    }
  };

  statics.delete_and_release_by_query = async function(query) {
    const files = await this.find(query).limit(99999999);
    if (Helper.empty(files)) { return; }
    const pipeline = await this.release_multi_files_cache(files);
    await pipeline.exec();
    await this.deleteMany(query);
  };

  statics.delete_project = async function(project_id) {
    assert(project_id);
    await this.delete_and_release_by_query({ project_id })
      .catch(err => {
        logger.error(err);
        throw err;
      });
  };

  statics.delete_account = async function(account_id) {
    assert(account_id);
    await this.delete_and_release_by_query({ account_id })
      .catch(err => {
        logger.error(err);
        throw err;
      });
  };

  NodeSchema.post('save', async function(file) {
    const pipeline = statics.release_cache(file);
    await pipeline.exec()
      .catch(err => {
        logger.error(err);
        throw err;
      });
  });

  return mongoose.model('Node', NodeSchema);
};
