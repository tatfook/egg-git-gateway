'use strict';

const Stringifier = require('./stringifier');
const _ = require('lodash/lang');
const path_helper = require('path').posix;

class Helper {
  static getNodeKey(project_id, path) {
    return `project:${project_id}:file:${path}`;
  }

  static getTreeKey(project_id, path) {
    return `project:${project_id}:tree:${path}`;
  }

  static getProjectKey(path) {
    return `project:${path}`;
  }

  static getAccountKey(kw_username) {
    return `account:${kw_username}`;
  }

  static project2Msg(project, method) {
    return Stringifier.project_stringifier({
      _id: project._id,
      visibility: project.visibility,
      path: project.path,
      method,
    });
  }

  static commit2Str(commit) {
    return Stringifier.commit_stringifier(commit);
  }

  static node2Str(file) {
    return Stringifier.node_stringifier(file);
  }

  static tree2Str(tree) {
    return Stringifier.tree_stringifier(tree);
  }

  static isEmpty(value) {
    return _.isEmpty(value);
  }

  static paginate(query) {
    const limit = Number(query.per_page) || 10000;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;
    return { skip, limit };
  }

  static* cycleInt(lt, gte = 0) {
    let current = gte;
    while (true) {
      yield current;
      current = (current + 1) % lt;
    }
  }

  static getNodeName(path) {
    return path_helper.basename(path);
  }

  static getParentPath(path) {
    return path_helper.dirname(path);
  }

  static parsePath(path) {
    return path_helper.parse(path);
  }

  static isFilePath(path) {
    return Boolean(path_helper.extname(path));
  }
}

module.exports = Helper;
