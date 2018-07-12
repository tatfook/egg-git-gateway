'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'Hello, git-gateway';
  }
}

module.exports = HomeController;
