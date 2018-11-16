'use strict';

module.exports = {
  empty(obj) {
    if (!obj) { return true; }
    if (Object.keys(obj).length === 0) {
      return true;
    }
    return false;
  },
  paginate(query) {
    const limit = Number(query.per_page) || 10000;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;
    return { skip, limit };
  },
  generate_file_key(project_id, path) {
    return `project:${project_id}:file:${path}`;
  },
  generate_tree_key(project_id, path) {
    return `project:${project_id}:tree:${path}`;
  },
  generate_project_key(path) {
    return `project:${path}`;
  },
  generate_account_key(kw_username) {
    return `account:${kw_username}`;
  },
};

