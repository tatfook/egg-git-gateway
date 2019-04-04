'use strict';

// const assert = require('assert');
const {
  isEmpty, getNodeName, getParentPath,
} = require('../lib/helper');
const { getCacheNodePlugin } = require('../lib/cachePlugins');

const root_path = '.';
const tree_type = 'tree';
const tree_fields = '_id name path type parent_path';
const tree_limit = 99999;

const inAnyOne = (...args) => {
  const [ key, obj1, obj2 ] = args;
  return obj1[key] || obj2[key];
};
const isTree = node => (node.type === tree_type);

// const deserialize_tree = serilized_tree => {
//   return JSON.parse(serilized_tree);
// };

module.exports = app => {
  // const redis = app.redis;
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  // const logger = app.logger;
  // const cache_expire = app.config.cache_expire;

  const NodeSchema = new Schema({
    name: String,
    path: String,
    parent_path: String,
    content: String,
    type: { type: String, default: 'blob' },
    project_id: String,
    account_id: Number,
  }, { timestamps: true });
  NodeSchema.index({ project_id: 1, path: 1 });
  const cachePlugin = getCacheNodePlugin(app);
  NodeSchema.plugin(cachePlugin);

  const statics = NodeSchema.statics;

  statics.getByPath = async function(...args) {
    const [ project_id, path, from_cache = true ] = args;
    // let node;
    if (from_cache) {
      // todo: load from cache
    }
    const node = await this.findOne({ project_id, path });
    node.cache();
    return node;
  };

  statics.getTreeByPath = async function(...args) {
    // todo: load from cache
    const [
      path, project_id, recursive = false, from_cache = false,
    ] = args;
    console.log(from_cache);
    const parent_path = path;
    const query = { project_id, parent_path };
    let tree = [];
    const children = await this.getTreeByQyery(query);
    tree = tree.concat(children);
    if (recursive) return await this.getSubTrees(tree, children, project_id);
    return tree;
  };

  statics.getSubTrees = async function(tree, parents, project_id) {
    if (isEmpty(parents)) return tree;
    let children = [];
    for (const parent of parents) {
      if (isTree(parent)) {
        const query = { project_id, parent_path: parent.path };
        children = children.concat(await this.getTreeByQyery(query));
      }
    }
    tree = tree.concat(children);
    return await this.getSubTrees(tree, children, project_id);
  };

  statics.getRootTree = async function(...args) {
    // todo: load from cache
    const [ project_id, recursive, from_cache = false ] = args;
    console.log(from_cache);
    const query = { project_id };
    if (!recursive) query.parent_path = root_path;
    const tree = await this.getTreeByQyery(query);
    return tree;
  };

  statics.getTreeByQyery = async function(...args) {
    const [ query ] = args;
    return await this.find(query, tree_fields).limit(tree_limit);
  };

  statics.getAncestorNodes = async function(...args) {
    const [
      account_id, project_id, to_create,
      already_exist, node,
    ] = args;
    let parent_path = node.parent_path || getParentPath(node.path);
    while (parent_path !== root_path) {
      const checked = inAnyOne(parent_path, to_create, already_exist);
      if (checked) return;
      let parent_node = await this.getByPath(project_id, parent_path);
      if (parent_node) {
        already_exist[parent_path] = true;
      } else {
        const path = parent_path;
        const name = getNodeName(path);
        parent_path = getParentPath(path);
        parent_node = {
          name, account_id, project_id, path,
          type: tree_type, parent_path,
        };
        to_create[path] = parent_node;
      }
    }
  };

  statics.getParentsNotExist = async function(account_id, project_id, nodes) {
    const to_create = {};
    const already_exist = {};
    if (!(nodes instanceof Array)) { nodes = [{ path: nodes }]; }
    for (const node of nodes) {
      await this.getAncestorNodes(
        account_id, project_id, to_create, already_exist, node
      );
    }
    return Object.values(to_create);
  };

  statics.ensureParentExist = async function(account_id, project_id, path) {
    const to_create = await this
      .getParentsNotExist(account_id, project_id, path);
    if (!isEmpty(to_create)) await this.create(to_create);
  };

  statics.deleteNodes = async function(nodes) {
    const tasks = [];
    for (const node of nodes) {
      const { _id } = node;
      tasks.push({ deleteOne: { filter: { _id } } });
    }
    return await this.bulkWrite(tasks);
  };

  statics.updateNodes = async function(nodes) {
    const tasks = [];
    for (const node of nodes) {
      const { _id, name, path, parent_path } = node;
      tasks.push({ updateOne: {
        filter: { _id },
        update: { name, path, parent_path },
      } });
    }
    return await this.bulkWrite(tasks);
  };

  // NodeSchema.virtual('tree_path').get(function() {
  //   const path = this.previous_path || this.path;
  //   const name = this.previous_name || this.name;
  //   return statics.getTreePath(path, name);
  // });

  // statics.getNodeName = function(path) {
  //   return path_helper.basename(path);
  // };

  // statics.getParentPath = function(path) {
  //   return path_helper.dirname(path);
  // };

  // statics.cache = function(file, pipeline = redis.pipeline()) {
  //   assert(file.project_id);
  //   assert(file.path);
  //   this.cache_content(file, pipeline);
  //   return pipeline;
  // };

  // statics.release_cache = function(file, pipeline = redis.pipeline()) {
  //   assert(file.project_id);
  //   assert(file.path);
  //   this.release_content_cache(file, pipeline);
  //   this.release_tree_cache(file, pipeline);
  //   return pipeline;
  // };

  // statics.cache_content = function(file, pipeline = redis.pipeline()) {
  //   const key = Helper.getNodeKey(file.project_id, file.path);
  //   pipeline.setex(key, cache_expire, Helper.node2Str(file));
  // };

  // statics.release_content_cache = function(file, pipeline = redis.pipeline()) {
  //   const path = file.previous_path || file.path;
  //   const key = Helper.getNodeKey(file.project_id, path);
  //   pipeline.del(key);
  // };

  // statics.load_content_cache_by_path = async function(project_id, path) {
  //   const key = Helper.getNodeKey(project_id, path);
  //   const project = await redis.get(key)
  //     .catch(err => {
  //       logger.error(err);
  //     });
  //   return JSON.parse(project);
  // };

  // statics.cache_tree = function(project_id, path, tree, pipeline = redis.pipeline()) {
  //   const key = Helper.getTreeKey(project_id, path);
  //   pipeline.setex(key, cache_expire, Helper.tree2Str(tree));
  //   return pipeline;
  // };

  // statics.load_tree_cache_by_path = async function(project_id, path) {
  //   const key = Helper.getTreeKey(project_id, path);
  //   const serilized_tree = await redis.get(key)
  //     .catch(err => {
  //       logger.error(err);
  //     });
  //   return deserialize_tree(serilized_tree);
  // };

  // statics.release_tree_cache = function(file, pipeline = redis.pipeline()) {
  //   const key = Helper.getTreeKey(file.project_id, file.tree_path);
  //   pipeline.del(key);
  //   return pipeline;
  // };

  // statics.release_multi_files_cache = function(files, project_id, pipeline = redis.pipeline()) {
  //   const keys_to_release = [];
  //   for (const file of files) {
  //     file.project_id = file.project_id || project_id;
  //     const file_key = Helper.getNodeKey(
  //       file.project_id || project_id,
  //       file.previous_path || file.path
  //     );
  //     keys_to_release.push(file_key);

  //     if (file.type === 'tree') {
  //       const tree_key = Helper.getTreeKey(
  //         file.project_id || project_id,
  //         file.previous_path || file.path
  //       );
  //       keys_to_release.push(tree_key);
  //     }
  //   }
  //   pipeline.del(keys_to_release);
  //   return pipeline;
  // };

  // statics.get_by_path_from_db = async function(project_id, path) {
  //   const file = await this.findOne({ project_id, path })
  //     .catch(err => { logger.error(err); });
  //   if (!isEmpty(file)) {
  //     const pipeline = this.cache(file);
  //     await pipeline.exec()
  //       .catch(err => {
  //         logger.error(err);
  //         throw err;
  //       });
  //     return file;
  //   }
  // };

  // statics.move = async function(file) {
  //   const pipeline = this.release_cache(file);
  //   await pipeline.exec()
  //     .catch(err => {
  //       logger.error(err);
  //       throw err;
  //     });
  //   await file.save()
  //     .catch(err => {
  //       logger.error(err);
  //       throw err;
  //     });
  // };

  // statics.delete_and_release_cache = async function(file) {
  //   const pipeline = this.release_cache(file);
  //   await pipeline.exec()
  //     .catch(err => {
  //       logger.error(err);
  //       throw err;
  //     });

  //   const path = file.path;
  //   await this.deleteOne({ path })
  //     .catch(err => {
  //       logger.error(`failed to hard delete file ${path}`);
  //       throw err;
  //     });
  // };

  // statics.get_subfiles_by_path = async function(project_id, tree_path, pattern, get_self = true) {
  //   if (!pattern) { pattern = new RegExp(`^${tree_path}/.*`, 'u'); }
  //   const subfiles = await this.find({ project_id, path: pattern })
  //     .limit(999999)
  //     .catch(err => {
  //       logger.error(err);
  //       throw err;
  //     });

  //   if (get_self) {
  //     const folder = await this.findOne({ project_id, path: tree_path })
  //       .catch(err => {
  //         logger.error(err);
  //         throw err;
  //       });
  //     subfiles.push(folder);
  //   }
  //   return subfiles;
  // };

  // statics.delete_subfiles_and_release_cache =
  // async function(project_id, tree_path, subfiles, remove_self = true) {
  //   const pattern = new RegExp(`^${tree_path}/.*`, 'u');
  //   if (!subfiles) {
  //     subfiles = await this.get_subfiles_by_path(project_id, tree_path, pattern, remove_self)
  //       .catch(err => {
  //         logger.error(err);
  //         throw err;
  //       });
  //   }
  //   if (isEmpty(subfiles)) { return; }

  //   const pipeline = this.release_multi_files_cache(subfiles, project_id);
  //   await pipeline.exec()
  //     .catch(err => {
  //       logger.error(err);
  //       throw err;
  //     });

  //   await this.deleteMany({ project_id, path: pattern })
  //     .catch(err => {
  //       logger.error(err);
  //       throw err;
  //     });

  //   if (remove_self) {
  //     const folder = subfiles[subfiles.length - 1];
  //     if (!isEmpty(folder)) {
  //       await folder.remove()
  //         .catch(err => {
  //           logger.error(err);
  //           throw err;
  //         });
  //     }
  //   }
  // };

  // statics.delete_and_release_by_query = async function(query) {
  //   const files = await this.find(query).limit(99999999);
  //   if (isEmpty(files)) { return; }
  //   const pipeline = await this.release_multi_files_cache(files);
  //   await pipeline.exec();
  //   await this.deleteMany(query);
  // };

  // statics.delete_project = async function(project_id) {
  //   assert(project_id);
  //   await this.delete_and_release_by_query({ project_id })
  //     .catch(err => {
  //       logger.error(err);
  //       throw err;
  //     });
  // };

  // statics.delete_account = async function(account_id) {
  //   assert(account_id);
  //   await this.delete_and_release_by_query({ account_id })
  //     .catch(err => {
  //       logger.error(err);
  //       throw err;
  //     });
  // };

  // NodeSchema.post('save', async function(file) {
  //   const pipeline = statics.release_cache(file);
  //   await pipeline.exec()
  //     .catch(err => {
  //       logger.error(err);
  //       throw err;
  //     });
  // });

  NodeSchema.post('remove', async function() {
    console.log('remove post hook');
  });

  return mongoose.model('Node', NodeSchema);
};
