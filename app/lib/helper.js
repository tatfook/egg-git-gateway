'use strict';

const Stringifier = require('./stringifier');

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

  static project_to_message(project, method) {
    return Stringifier.stringify_project({
      _id: project._id,
      visibility: project.visibility,
      path: project.path,
      method,
    });
  }

  static commit_to_message(commit) {
    return Stringifier.stringify_commit(commit);
  }

  static serilize_file(file) {
    return Stringifier.stringify_file(file);
  }

  static serilize_tree(tree) {
    return Stringifier.stringify_tree(tree);
  }

  static empty(obj) {
    if (!obj) { return true; }
    if (Object.keys(obj).length === 0) {
      return true;
    }
    return false;
  }

  static paginate(query) {
    const limit = Number(query.per_page) || 10000;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;
    return { skip, limit };
  }
}

module.exports = Helper;
