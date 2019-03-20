'use strict';

const Stringifier = require('./stringifier');
const _ = require('lodash/lang');
const path_helper = require('path').posix;

class Helper {
  static generate_file_key(project_id, path) {
    return `project:${project_id}:file:${path}`;
  }

  static generate_tree_key(project_id, path) {
    return `project:${project_id}:tree:${path}`;
  }

  static generate_project_key(path) {
    return `project:${path}`;
  }

  static generate_account_key(kw_username) {
    return `account:${kw_username}`;
  }

  static project2Msg(project, method) {
    return Stringifier.stringify_project({
      _id: project._id,
      visibility: project.visibility,
      path: project.path,
      method,
    });
  }

  static commit2Msg(commit) {
    return Stringifier.stringify_commit(commit);
  }

  static serilize_file(file) {
    return Stringifier.stringify_file(file);
  }

  static serilize_tree(tree) {
    return Stringifier.stringify_tree(tree);
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
