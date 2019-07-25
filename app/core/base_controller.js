'use strict';

const Controller = require('egg').Controller;

class Base_controllerController extends Controller {
  success(action = 'success', extraMsg = {}) {
    const { ctx } = this;
    extraMsg[action] = true;
    ctx.body = extraMsg;
  }

  created(extraMsg) {
    this.ctx.status = 201;
    this.success('created', extraMsg);
  }

  updated(extraMsg) {
    this.success('updated', extraMsg);
  }

  deleted(extraMsg) {
    this.success('deleted', extraMsg);
  }

  moved(extraMsg) {
    this.success('moved', extraMsg);
  }
}

module.exports = Base_controllerController;
