'use strict';

const assert = require('assert');

module.exports = {
  empty(obj) {
    if (!obj) { return true; }
    if (Object.keys(obj).length === 0) {
      return true;
    }
    return false;
  },
  paginate(query) {
    const limit = Number(query.per_page) || 20;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;
    return { skip, limit };
  },
  generate_file_key(path) {
    assert(path);
    return `file:${path}`;
  },
  generate_tree_key(path) {
    assert(path);
    return `tree:${path}`;
  },
  generate_project_key(path) {
    assert(path);
    return `project:${path}`;
  },
  generate_account_key(kw_username) {
    assert(kw_username);
    return `accounts-kw_username:${kw_username}`;
  },
};

