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
    site_id: Number,
    sitename: String,
    path: { type: String, unique: true },
    git_path: String,
  }, {
    timestamps: true,
  });

  const statics = ProjectSchema.statics;

  statics.cache = async function(project) {
    const key = generate_redis_key(project.path);
    const serilized_project = JSON.stringify(project);
    await redis.set(key, serilized_project)
      .catch(err => {
        console.log(`fail to cache project ${key}`);
        console.error(err);
      });
  };

  statics.release_cache_by_path = async function(path) {
    const key = generate_redis_key(path);
    await redis.del(key)
      .catch(err => {
        console.log(`fail to release cache of project ${key}`);
        console.error(err);
      });
  };

  statics.load_cache_by_path = async function(path) {
    const key = generate_redis_key(path);
    const project = await redis.get(key)
      .catch(err => {
        console.error(err);
      });
    return JSON.parse(project);
  };

  statics.get_by_path = async function(path, from_cache = true) {
    let project;

    // load from cache
    if (from_cache) {
      project = await this.load_cache_by_path(path);
      if (!empty(project)) { return project; }
    }

    // load from db
    project = await this.findOne({ path })
      .catch(err => { console.error(err); });
    if (!empty(project)) {
      await this.cache(project);
      return project;
    }
  };

  statics.get_by_path_from_db = async function(path) {
    return this.get_by_path(path, false);
  };

  statics.delete_and_release_cache_by_path = async function(path) {
    await this.release_cache_by_path(path);
    await this.deleteMany({ path })
      .catch(err => {
        throw err;
      });
  };

  ProjectSchema.post('save', async function(project) {
    await statics.cache(project);
  });

  return mongoose.model('Project', ProjectSchema);
};
