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
  for (const node of tree) {
    serilized_tree.push(node.path);
    serilized_tree.push(JSON.stringify(node));
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
    path: { type: String, index: true },
    content: String,
    size: Number,
    type: { type: String, default: 'blob' },
    status: { type: String, default: 'normal' },
  }, {
    timestamps: true,
  });

  FileSchema.statics.cache = async function(file) {
    if (file.status === 'deleted') { return; }
    const key = generate_file_key(file.path);
    const serilized_file = JSON.stringify(file);
    await redis.set(key, serilized_file)
      .catch(err => {
        console.log(`fail to cache file ${key}`);
        console.error(err);
      });
  };

  FileSchema.statics.release_cache_by_path = async function(path) {
    const key = generate_file_key(path);
    await redis.del(key)
      .catch(err => {
        console.log(`fail to release cache of file ${key}`);
        console.error(err);
      });
  };

  FileSchema.statics.load_cache_by_path = async function(path) {
    const key = generate_file_key(path);
    const project = await redis.get(key)
      .catch(err => {
        console.log(err);
      });
    return JSON.parse(project);
  };

  FileSchema.statics.cache_tree = async function(path, tree) {
    const key = generate_tree_key(path);
    await redis.hmset(key, serilize_tree(tree))
      .catch(err => {
        console.log(err);
      });
  };

  FileSchema.statics.load_tree_cache_by_path = async function(path) {
    const key = generate_tree_key(path);
    const serilized_tree = await redis.hvals(key)
      .catch(err => {
        console.log(err);
      });
    return deserialize_tree(serilized_tree);
  };

  FileSchema.statics.get_by_path = async function(path, from_cache = true) {
    let file;

    // load from cache
    if (from_cache) {
      file = await this.load_cache_by_path(path);
      if (!empty(file)) { return file; }
    }

    // load from db
    file = await this.findOne({ path })
      .catch(err => { console.log(err); });
    if (!empty(file)) {
      await this.cache(file);
      return file;
    }
  };

  FileSchema.statics.get_by_path_from_db = async function(path) {
    return this.get_by_path(path, false);
  };

  FileSchema.statics.delete_and_release_cache_by_path = async function(path) {
    await this.release_cache_by_path(path);
    await this.deleteMany({ path })
      .catch(err => {
        throw err;
      });
  };

  FileSchema.statics.get_tree_by_path = async function(
    path, from_cache = true, recursive = false, pagination) {
    let tree;
    if (!recursive) {
      pagination = { skip: 0, limit: 9999999 };
      if (from_cache) {
        tree = await this.load_tree_cache_by_path(path);
        if (tree.length > 0) { return tree; }
      }
    }

    const path_pattern = recursive ? `^${path}\/` : `^${path}\/[^\/]+$`;
    const query_condition = { path: new RegExp(path_pattern, 'u') };
    const selected_fields = 'name path type -_id';
    tree = await this.find(query_condition, selected_fields)
      .find({ status: 'normal' })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .catch(err => { console.log(err); });
    if (tree.length > 0 && !recursive) { this.cache_tree(path, tree); }
    return tree;
  };

  FileSchema.post('save', async function(file) {
    await FileSchema.statics.cache(file);
  });

  return mongoose.model('File', FileSchema);
};
