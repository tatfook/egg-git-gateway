'use strict';

const assert = require('assert');
const { empty } = require('../helper');

const generate_redis_key = path => {
  assert(path);
  return `project:${path}`;
};

module.exports = app => {
  const redis = app.redis;
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const ProjectSchema = new Schema({
    _id: Number,
    visibility: { type: String, default: 'public' },
    name: String,
    sitename: String,
    path: { type: String, index: true },
    git_path: String,
  }, {
    timestamps: true,
  });

  ProjectSchema.statics.cache = async function(project) {
    const key = generate_redis_key(project.path);
    const serilized_project = JSON.stringify(project);
    await redis.set(key, serilized_project)
      .catch(err => {
        console.log(`fail to cache project ${key}`);
        console.error(err);
      });
  };

  ProjectSchema.statics.release_cache_by_path = async function(path, decoded = true) {
    if (!decoded) { path = decodeURI(path); }
    const key = generate_redis_key(path);
    await redis.del(key)
      .catch(err => {
        console.log(`fail to release cache of project ${key}`);
        console.error(err);
      });
  };

  ProjectSchema.statics.load_cache_by_path = async function(path, decoded = true) {
    if (!decoded) { path = decodeURI(path); }
    const key = generate_redis_key(path);
    const project = await redis.get(key)
      .catch(err => {
        console.log(err);
      });
    return JSON.parse(project);
  };

  ProjectSchema.statics.get_by_path = async function(path, decoded = true, from_cache = true) {
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

  ProjectSchema.statics.get_by_path_from_db = async function(path, decoded = true) {
    return this.get_by_path(path, decoded, false);
  };

  ProjectSchema.statics.delete_and_release_cache_by_path = async function(path) {
    await this.release_cache_by_path(path);
    await this.deleteMany({ path })
      .catch(err => {
        throw err;
      });
  };

  ProjectSchema.post('save', async function(project) {
    await ProjectSchema.statics.cache(project);
  });

  return mongoose.model('Project', ProjectSchema);
};
