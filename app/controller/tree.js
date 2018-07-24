'use strict';

const Controller = require('egg').Controller;

class TreeController extends Controller {
  async show() {
    console.log(this.ctx.params.path);
    const tree = await this.ctx.model.File
      .get_tree_by_path(this.ctx.params.path);
    this.ctx.body = tree;
  }
}

module.exports = TreeController;
