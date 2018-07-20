'use strict';

const assert = require('assert');
const { empty } = require('../helper');

const generate_redis_key = path => {
  assert(path);
  return `file:${path}`;
};

module.exports = app => {
  const redis = app.redis;
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const FileSchema = new Schema({
    name: { type: String },
    path: { type: String },
    content: { type: String },
    size: { type: Number },
    project_id: { type: Number },
    blob_id: { type: Number },
    commit_id: { type: String },
    last_commit_id: { type: String },
  }, {
    timestamps: true,
  });

  FileSchema.statics.cache = async function(file) {
    const key = generate_redis_key(file.path);
    const serilized_file = JSON.stringify(file);
    await redis.set(key, serilized_file)
      .catch(err => {
        console.log(`fail to cache file ${key}`);
        console.error(err);
      });
  };

  FileSchema.statics.release_cache_by_path = async function(path, decoded = true) {
    if (!decoded) { path = decodeURI(path); }
    const key = generate_redis_key(path);
    await redis.del(key)
      .catch(err => {
        console.log(`fail to release cache of file ${key}`);
        console.error(err);
      });
  };

  FileSchema.statics.load_cache_by_path = async function(path, decoded = true) {
    if (!decoded) { path = decodeURI(path); }
    const key = generate_redis_key(path);
    const project = await redis.get(key)
      .catch(err => {
        console.log(err);
      });
    return JSON.parse(project);
  };

  FileSchema.statics.get_by_path = async function(path, decoded = true, from_cache = true) {
    if (!decoded) { path = decodeURI(path); }
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

  FileSchema.statics.get_by_path_from_db = async function(path, decoded = true) {
    return this.get_by_path(path, decoded, false);
  };

  FileSchema.statics.delete_and_release_cache_by_path = async function(path) {
    await this.release_cache_by_path(path);
    await this.deleteMany({ path })
      .catch(err => {
        throw err;
      });
  };

  FileSchema.post('save', async function(file) {
    await FileSchema.statics.cache(file);
  });

  return mongoose.model('File', FileSchema);
};
