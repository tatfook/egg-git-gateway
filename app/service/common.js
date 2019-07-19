'use strict';

const Service = require('egg').Service;
const _ = require('lodash');

class CommonService extends Service {
  throwIfNotExist(object, errMsg) {
    const { ctx } = this;
    if (_.isEmpty(object)) ctx.throw(404, errMsg);
  }

  throwIfExists(object, errMsg) {
    const { ctx } = this;
    if (!_.isEmpty(object)) ctx.throw(409, errMsg);
  }
}

module.exports = CommonService;
