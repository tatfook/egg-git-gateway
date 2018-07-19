'use strict';

module.exports = {
  empty(obj) {
    if (!obj) { return true; }
    if (Object.keys(obj).length === 0) {
      return true;
    }
    return false;
  },
};

