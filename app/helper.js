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
    const limit = Number(query.pageSize) || 20;
    const pageNo = Number(query.pageNo) || 1;
    const skip = (pageNo - 1) * limit;
    return { skip, limit };
  },
};

