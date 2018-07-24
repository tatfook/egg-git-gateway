'use strict';

const assert = require('assert');
const { empty } = require('../helper');

const generate_file_key = path => {
  assert(path);
  return `file:${path}`;
};

// const generate_tree_key = path => {
//   assert(path);
//   return `tree:${path}`;
// };

module.exports = app => {
  const redis = app.redis;
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const FileSchema = new Schema({
    name: String,
    path: { type: String, index: true },
    content: String,
    size: Number,
    project_id: Number,
    blob_id: String,
    commit_id: String,
    last_commit_id: String,
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

  FileSchema.statics.get_by_path = async function(path, from_cache = true) {
    let project;

    // load from cache
    if (from_cache) {
      project = await this.load_cache_by_path(path);
      if (!empty(project)) { return project; }
    }

    // load from db
    project = await this.findOne({ path })
      .catch(err => { console.log(err); });
    if (!empty(project)) {
      await this.cache(project);
      return project;
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

  FileSchema.statics.get_tree_by_path = async function(path, recursive = false) {
    let path_pattern;
    if (recursive) {
      path_pattern = `^${path}\/`;
    } else {
      path_pattern = `^${path}\/[^\/]+$`;
    }
    const tree = await this.find(
      { path: new RegExp(path_pattern, 'u') },
      'name path type -_id'
    ).catch(err => { console.log(err); });
    return tree;
  };

  FileSchema.post('save', async function(file) {
    await FileSchema.statics.cache(file);
  });

  return mongoose.model('File', FileSchema);
};
