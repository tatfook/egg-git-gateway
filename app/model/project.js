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
    _id: { type: Number },
    site_id: { type: Number },
    visibility: { type: String },
    name: { type: String },
    path: { type: String },
    account_id: { type: Number },
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

  ProjectSchema.statics.get_by_path = async function(path, decoded = true) {
    if (!decoded) { path = decodeURI(path); }

    // load from cache
    let project = await ProjectSchema.statics.load_cache_by_path(path);
    if (!empty(project)) { return project; }

    // load from db
    project = await this.findOne({ path })
      .catch(err => { console.log(err); });
    if (!empty(project)) {
      await ProjectSchema.statics.cache(project);
      return project;
    }
  };

  ProjectSchema.statics.update_visibility_by_path = async function(path, visibility) {
    const project = await this.findOne({ path })
      .catch(err => {
        console.log(err);
        throw err;
      });
    if (empty(project)) { return Promise.reject(`project ${path} not exist`); }

    project.visibility = visibility;
    return project.save().catch(err => {
      console.log(`fail to update visibility of project ${path}`);
      throw err;
    });
  };

  ProjectSchema.statics.delete_and_release_cache_by_path = async function(path) {
    await ProjectSchema.statics.release_cache_by_path(path);
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
