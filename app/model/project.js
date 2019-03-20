'use strict';

// const assert = require('assert');
// const fast_JSON = require('fast-json-stringify');

module.exports = app => {
  // const redis = app.redis;
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  // const logger = app.logger;
  // const cache_expire = app.config.cache_expire;

  const ProjectSchema = new Schema({
    // _id: Number,
    visibility: { type: String, default: 'public' },
    repo_name: String,
    site_id: Number,
    sitename: String,
    path: { type: String, unique: true },
    git_path: String,
    account_id: Number,
  }, { timestamps: true });

  ProjectSchema.index({ path: 1 });

  // const stringify = fast_JSON({
  //   title: 'stringify project',
  //   type: 'object',
  //   properties: {
  //     _id: { type: 'number' },
  //     visibility: { type: 'string' },
  //     name: { type: 'string' },
  //     site_id: { type: 'number' },
  //     sitename: { type: 'string' },
  //     path: { type: 'string' },
  //     git_path: { type: 'string' },
  //     account_id: { type: 'number' },
  //   },
  // });

  const statics = ProjectSchema.statics;

  // statics.cache = async function(project) {
  //   const key = generate_project_key(project.path);
  //   const serilized_project = stringify(project);
  //   await redis.setex(key, cache_expire, serilized_project)
  //     .catch(err => {
  //       logger.error(`fail to cache project ${key}`);
  //       logger.error(err);
  //     });
  // };

  // statics.release_cache = async function(path, pipeline = redis.pipeline()) {
  //   this.release_content_cache(path, pipeline);
  //   this.release_tree_cache(path, pipeline);
  //   await pipeline.exec()
  //     .catch(err => {
  //       logger.error(`fail to release cache of project ${path}`);
  //       logger.error(err);
  //     });
  // };

  // statics.release_content_cache = async function(path, pipeline = redis.pipeline()) {
  //   const key = generate_project_key(path);
  //   pipeline.del(key);
  // };

  // statics.release_tree_cache = function(path, pipeline = redis.pipeline()) {
  //   const key = generate_tree_key(path);
  //   pipeline.del(key);
  // };

  // statics.load_cache_by_path = async function(path) {
  //   const key = generate_project_key(path);
  //   const project = await redis.get(key)
  //     .catch(err => {
  //       logger.error(err);
  //     });
  //   return JSON.parse(project);
  // };

  statics.getByPath = async function(path, from_cache = true) {
    // let project;

    if (from_cache) {
      // todo: load from cache
    }

    // load from db
    const project = await this.findOne({ path });
    return project;
  };

  // statics.get_by_path_from_db = async function(path) {
  //   const project = await this.findOne({ path })
  //     .catch(err => { logger.error(err); });
  //   if (!isEmpty(project)) {
  //     await this.cache(project);
  //     return project;
  //   }
  // };

  // statics.delete_and_release_cache = async function(path) {
  //   await this.release_cache(path);
  //   await this.deleteOne({ path })
  //     .catch(err => {
  //       throw err;
  //     });
  // };

  // statics.release_multi_projects_cache = async function(projects, pipeline = redis.pipeline()) {
  //   const keys_to_release = [];
  //   for (const project of projects) {
  //     keys_to_release.push(generate_project_key(project.path));
  //     keys_to_release.push(generate_tree_key(project.path));
  //   }
  //   pipeline.del(keys_to_release);
  //   return pipeline;
  // };

  // statics.delete_and_release_by_query = async function(query) {
  //   const projects = await this.find(query).limit(99999999);
  //   if (isEmpty(projects)) { return; }
  //   const pipeline = await this.release_multi_projects_cache(projects);
  //   await pipeline.exec();
  //   await this.deleteMany(query);
  // };

  // statics.delete_account = async function(account_id) {
  //   assert(account_id);
  //   await this.delete_and_release_by_query({ account_id })
  //     .catch(err => {
  //       logger.error(err);
  //       throw err;
  //     });
  // };

  // ProjectSchema.post('save', async function(project) {
  //   await statics.release_cache(project.path);
  // });

  return mongoose.model('Project', ProjectSchema);
};
