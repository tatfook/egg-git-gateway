'use strict';

const Controller = require('../core/base_controller');
const { paginate } = require('../lib/helper');

class TreeController extends Controller {

  /**
  * @api {get} /tree/:encoded_path get
  * @apiName GetTree
  * @apiGroup Tree
  * @apiDescription To get a tree
  * @apiPermission anyone
  *
  * @apiParam {String} encoded_path Urlencoded tree path such as 'username%2Fsitename'
  * @apiParam {Boolean} [recursive=false] Whether get all sub tree
  * @apiParam {Number} [page=1] Page number, only works if recursive = true
  * @apiParam {Number} [per_page=20] Items amount for a page, only works if recursive = true
  * @apiParam {Boolean} [refresh_cache=false]  Whether refresh the cache of this tree
  */
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
