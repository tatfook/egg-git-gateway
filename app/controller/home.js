'use strict';

const Controller = require('../core/base_controller');

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'Hello, git-gateway';
  }
}

module.exports = HomeController;
