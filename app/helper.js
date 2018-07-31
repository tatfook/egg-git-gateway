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
    const limit = Number(query.per_page) || 20;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;
    return { skip, limit };
  },
};

