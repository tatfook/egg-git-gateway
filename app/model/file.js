'use strict';

const assert = require('assert');
const { empty } = require('../helper');

const generate_file_key = path => {
  assert(path);
  return `file:${path}`;
};

const generate_tree_key = path => {
  assert(path);
  return `tree:${path}`;
};

const serilize_file = file => JSON.stringify({
  path: file.path,
  type: file.type,
  content: file.content,
});

const serilize_tree = tree => {
  const serilized_tree = [];
  if (tree instanceof Array) {
    for (const node of tree) {
      serilized_tree.push(node.path);
      serilized_tree.push(JSON.stringify(node));
    }
  } else {
    serilized_tree.push(tree.path);
    serilized_tree.push(JSON.stringify({
      type: tree.type,
      name: tree.name,
      path: tree.path,
    }));
  }
  return serilized_tree;
};

const deserialize_tree = serilized_tree => {
  const tree = [];
  for (const node of serilized_tree) {
    tree.push(JSON.parse(node));
  }
  return tree;
};

module.exports = app => {
  const redis = app.redis;
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const FileSchema = new Schema({
    name: String,
    path: { type: String, unique: true },
    content: String,
    type: { type: String, default: 'blob' },
    status: String,
  }, { timestamps: true });

  const statics = FileSchema.statics;

  FileSchema.virtual('project_path').get(function() {
    return statics.get_project_path(this.path);
  });

  FileSchema.virtual('tree_path').get(function() {
    return statics.get_tree_path(this.path, this.name);
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

  statics.get_project_path = function(path) {
    const project_path_pattern = /^[^\/]+\/[^\/]+/;
    try {
      const project_path = path.match(project_path_pattern)[0];
      return project_path;
    } catch (err) {
      console.log('invalid path');
      throw err;
    }
  };

  statics.cache = async function(file, pipeline = redis.pipeline()) {
    this.cache_content(file, pipeline);
    const update_content_only = (file.status === 'updating');
    if (!update_content_only) {
      await this.cache_tree_if_exists(file.tree_path, file, pipeline);
    }
    return pipeline;
  };

  statics.release_cache = function(file, pipeline = redis.pipeline()) {
    this.release_content_cache(file, pipeline);
    this.release_node_cache(file, pipeline);
    if (file.type === 'tree') { this.release_tree_cache(file, pipeline); }
    return pipeline;
  };

  statics.cache_content = function(file, pipeline = redis.pipeline()) {
    const soft_deleting = (file.status === 'deleting');
    if (soft_deleting) { return pipeline; }
    const key = generate_file_key(file.path);
    pipeline.set(key, serilize_file(file));
  };

  statics.move_cache = async function(file, pipeline = redis.pipeline()) {
    assert(file.previous_path);
    this.release_content_cache({ path: file.previous_path }, pipeline);
    this.release_node_cache({ path: file.previous_path }, pipeline);
    return pipeline;
  };

  statics.release_content_cache = function(file, pipeline = redis.pipeline()) {
    const key = generate_file_key(file.path);
    pipeline.del(key);
  };

  statics.load_content_cache_by_path = async function(path) {
    const key = generate_file_key(path);
    const project = await redis.get(key)
      .catch(err => {
        console.error(err);
      });
    return JSON.parse(project);
  };

  statics.cache_tree = function(path, tree, pipeline = redis.pipeline()) {
    const key = generate_tree_key(path);
    pipeline.hmset(key, serilize_tree(tree));
  };

  statics.cache_tree_if_exists = async function(path, tree, pipeline = redis.pipeline()) {
    const key = generate_tree_key(path);
    const exists = await redis.exists(key);
    if (exists) { this.cache_tree(path, tree, pipeline); }
  };

  statics.load_tree_cache_by_path = async function(path) {
    const key = generate_tree_key(path);
    const serilized_tree = await redis.hvals(key)
      .catch(err => {
        console.error(err);
      });
    return deserialize_tree(serilized_tree);
  };

  // todo: release recursive
  statics.release_tree_cache = function(file, pipeline = redis.pipeline()) {
    const key = generate_tree_key(file.path);
    pipeline.del(key);
  };

  statics.release_node_cache = function(file, pipeline = redis.pipeline()) {
    const tree_path = this.get_tree_path(file.path);
    const key = generate_tree_key(tree_path);
    pipeline.hdel(key, file.path);
  };

  statics.get_by_path_from_db = async function(path) {
    const file = await this.findOne({ path })
      .catch(err => { console.error(err); });
    if (!empty(file)) {
      await this.cache(file);
      return file;
    }
  };

  statics.get_by_path = async function(path, from_cache = true) {
    let file;
    if (from_cache) {
      file = await this.load_content_cache_by_path(path);
      if (!empty(file)) { return file; }
    }
    file = await this.get_by_path_from_db(path);
    return file;
  };

  statics.move = async function(file) {
    const pipeline = this.release_cache({ path: file.previous_path });
    await pipeline.exec()
      .catch(err => {
        console.error(err);
        throw err;
      });
    await file.save()
      .catch(err => {
        console.error(err);
        throw err;
      });
  };

  statics.delete_and_release_cache = async function(file, hard = false) {
    const pipeline = this.release_cache(file);
    await pipeline.exec()
      .catch(err => {
        console.error(err);
        throw err;
      });

    const path = file.path;
    if (hard) {
      await this.deleteOne({ path })
        .catch(err => {
          console.log(`failed to hard delete file ${path}`);
          throw err;
        });
      return;
    }
    await this.updateOne({ path }, { status: 'deleting' })
      .catch(err => {
        console.log(`failed to soft delete file ${path}`);
        throw err;
      });
  };

  statics.get_tree_by_path_from_db = async function(
    path, recursive = false, pagination) {
    const path_pattern = recursive ? `^${path}\/` : `^${path}\/[^\/]+$`;
    const query_condition = { path: new RegExp(path_pattern, 'u') };
    const selected_fields = 'name path type -_id';
    const tree = await this.find(query_condition, selected_fields)
      .find({ status: 'normal' })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .catch(err => { console.error(err); });
    if (tree.length > 0 && !recursive) { await this.cache_tree(path, tree); }
    return tree;
  };

  statics.get_tree_by_path = async function(
    path, from_cache = true, recursive = false, pagination) {
    let tree;
    if (!recursive) {
      pagination = { skip: 0, limit: 9999999 };
      if (from_cache) {
        tree = await this.load_tree_cache_by_path(path);
        if (tree.length > 0) { return tree; }
      }
    }
    tree = await this.get_tree_by_path_from_db(path, recursive, pagination);
    return tree;
  };

  statics.ensure_parent_exist = async function(path) {
    const ancestor_names = path.split('/');
    if (ancestor_names.length <= 3) { return; }
    const file_name = ancestor_names[ancestor_names.length - 1];
    const parent_path = this.get_tree_path(path, file_name);
    const parent = await this.get_by_path(parent_path);
    if (empty(parent)) {
      const errMsg = `Parent folder ${parent_path} not found`;
      return errMsg;
    }
  };

  FileSchema.post('save', async function(file) {
    const pipeline = await statics.cache(file)
      .catch(err => {
        console.error(err);
        throw err;
      });
    await pipeline.exec()
      .catch(err => {
        console.error(err);
        throw err;
      });
  });

  return mongoose.model('File', FileSchema);
};
