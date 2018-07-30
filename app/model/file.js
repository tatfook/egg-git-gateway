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
    status: { type: String, default: 'normal' },
  }, { timestamps: true });

  FileSchema.virtual('project_path').get(function() {
    const project_path_pattern = /^[^\/]+\/[^\/]+/;
    const project_path = this.path.match(project_path_pattern)[0];
    return project_path;
  });

  FileSchema.virtual('tree_path').get(function() {
    const file_name_pattern = new RegExp(`/${this.name}$`, 'u');
    const tree_path = this.path.replace(file_name_pattern, '');
    return tree_path;
  });

  const statics = FileSchema.statics;

  statics.cache = async function(file) {
    if (file.status === 'deleted') { return; }
    const key = generate_file_key(file.path);
    const serilized_file = JSON.stringify(file);
    await redis.set(key, serilized_file)
      .catch(err => {
        console.log(`failed to cache file ${key}`);
        console.error(err);
      });
    await this.cache_tree_if_exists(file.tree_path, file);
  };

  statics.release_cache = async function(file) {
    const key = generate_file_key(file.path);
    await redis.del(key)
      .catch(err => {
        console.log(`failed to release cache of file ${key}`);
        console.error(err);
      });
    await this.release_node_cache(file);
    if (file.type === 'tree') { await this.release_tree_cache(file); }
  };

  statics.load_cache_by_path = async function(path) {
    const key = generate_file_key(path);
    const project = await redis.get(key)
      .catch(err => {
        console.error(err);
      });
    return JSON.parse(project);
  };

  statics.cache_tree = async function(path, tree) {
    const key = generate_tree_key(path);
    await redis.hmset(key, serilize_tree(tree))
      .catch(err => {
        console.error(err);
      });
  };

  statics.cache_tree_if_exists = async function(path, tree) {
    const key = generate_tree_key(path);
    const exists = await redis.exists(key);
    if (exists) { await this.cache_tree(path, tree); }
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
  statics.release_tree_cache = async function(file) {
    const key = generate_tree_key(file.path);
    await redis.del(key)
      .catch(err => {
        console.log(`failed to release cache of tree ${key}`);
        console.error(err);
      });
  };

  statics.release_node_cache = async function(file) {
    const key = generate_tree_key(file.tree_path);
    await redis.hdel(key, file.path)
      .catch(err => {
        console.log(`failed to release cache of tree ${key}`);
        console.error(err);
      });
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
      file = await this.load_cache_by_path(path);
      if (!empty(file)) { return file; }
    }
    file = await this.get_by_path_from_db(path);
    return file;
  };

  statics.delete_and_release_cache = async function(file, hard = false) {
    await this.release_cache(file);
    const path = file.path;
    if (hard) {
      await file.remove()
        .catch(err => {
          console.log(`failed to hard delete file ${path}`);
          throw err;
        });
      return;
    }
    await file.set({ status: 'deleted' }).save()
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

  FileSchema.post('save', async function(file) {
    await statics.cache(file);
  });

  return mongoose.model('File', FileSchema);
};
