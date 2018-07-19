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
    path_with_namespace: { type: String },
    account_id: { type: Number },
  }, {
    timestamps: true,
  });

  ProjectSchema.statics.cache = async project => {
    const key = generate_redis_key(project.path_with_namespace);
    const serilized_project = JSON.stringify(project);
    await redis.set(key, serilized_project)
      .catch(err => {
        console.log(`fail to cache project ${key}`);
        console.error(err);
      });
  };

  ProjectSchema.post('save', async project => {
    await ProjectSchema.static.cache(project);
  });

  ProjectSchema.statics.load_cache_by_path = async (path, decoded = true) => {
    if (!decoded) { path = decodeURI(path); }

    const key = generate_redis_key(path);
    const project = await redis.get(key)
      .catch(err => {
        console.log(err);
      });
    return JSON.parse(project);
  };

  ProjectSchema.statics.get_by_path = async (path, decoded = true) => {
    if (!decoded) { path = decodeURI(path); }

    // load from cache
    let project = await ProjectSchema.static.load_cache_by_path(path);
    if (!empty(project)) { return project; }

    // load from db
    project = await ProjectSchema.static.find({ path })
      .catch(err => { console.log(err); });
    if (!empty(project)) {
      await ProjectSchema.static.cache(project);
      return project;
    }
  };

  return mongoose.model('Project', ProjectSchema);
};
