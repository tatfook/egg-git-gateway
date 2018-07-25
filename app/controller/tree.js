'use strict';

const Controller = require('egg').Controller;
const { paginate } = require('../helper');

class TreeController extends Controller {
  async show() {
    const from_cache = !this.ctx.query.refresh_cache;
    const recursive = this.ctx.query.recursive;
    const tree = await this.ctx.model.File
      .get_tree_by_path(
        this.ctx.params.path,
        from_cache,
        recursive,
        paginate(this.ctx.query)
      );
    this.ctx.body = tree;
  }
}

module.exports = TreeController;