'use strict';

const assert = require('assert');
const fast_JSON = require('fast-json-stringify');
const _ = require('lodash');
const { generateProjectKey, generateTreeKey } = require('../lib/helper');

module.exports = app => {
  const redis = app.redis;
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const cache_expire = app.config.cache_expire;

  const ProjectSchema = new Schema({
    _id: Number,
    visibility: { type: String, default: 'public' },
    name: String,
    site_id: Number,
    sitename: String,
    path: { type: String, unique: true },
    git_path: String,
    account_id: Number,
  }, { timestamps: true });

  const stringify = fast_JSON({
    title: 'stringify project',
    type: 'object',
    properties: {
      _id: { type: 'number' },
      visibility: { type: 'string' },
      name: { type: 'string' },
      site_id: { type: 'number' },
      sitename: { type: 'string' },
      path: { type: 'string' },
      git_path: { type: 'string' },
      account_id: { type: 'number' },
    },
  });

  const statics = ProjectSchema.statics;

  statics.cache = async function(project) {
    const key = generateProjectKey(project.path);
    const serilized_project = stringify(project);
    await redis.setex(key, cache_expire, serilized_project);
  };

  statics.releaseCache = async function(path, pipeline = redis.pipeline()) {
    this.releaseContentCache(path, pipeline);
    this.releaseTreeCache(path, pipeline);
    await pipeline.exec();
  };

  statics.releaseContentCache = async function(path, pipeline = redis.pipeline()) {
    const key = generateProjectKey(path);
    pipeline.del(key);
  };

  statics.releaseTreeCache = function(path, pipeline = redis.pipeline()) {
    const key = generateTreeKey(path);
    pipeline.del(key);
  };

  statics.load_cache_by_path = async function(path) {
    const key = generateProjectKey(path);
    const project = await redis.get(key);
    return JSON.parse(project);
  };

  statics.getByPath = async function(path, from_cache = true) {
    let project;

    // load from cache
    if (from_cache) {
      project = await this.load_cache_by_path(path);
      if (!_.isEmpty(project)) { return project; }
    }
    // load from db
    project = await this.getByPathFromDB(path);
    return project;
  };

  statics.getByPathFromDB = async function(path) {
    const project = await this.findOne({ path });
    if (!_.isEmpty(project)) {
      await this.cache(project);
      return project;
    }
  };

  statics.deleteAndReleaseCache = async function(path) {
    await this.releaseCache(path);
    await this.deleteOne({ path });
  };

  statics.releaseMultiProjectsCache = async function(projects, pipeline = redis.pipeline()) {
    const keys_to_release = [];
    for (const project of projects) {
      keys_to_release.push(generateProjectKey(project.path));
      keys_to_release.push(generateTreeKey(project.path));
    }
    pipeline.del(keys_to_release);
    return pipeline;
  };

  statics.deleteAndReleaseByQuery = async function(query) {
    const projects = await this.find(query).limit(99999999);
    if (_.isEmpty(projects)) { return; }
    const pipeline = await this.releaseMultiProjectsCache(projects);
    await pipeline.exec();
    await this.deleteMany(query);
  };

  statics.deleteAccount = async function(account_id) {
    assert(account_id);
    await this.deleteAndReleaseByQuery({ account_id });
  };

  ProjectSchema.post('save', async function(project) {
    await statics.releaseCache(project.path);
  });

  return mongoose.model('Project', ProjectSchema);
};
