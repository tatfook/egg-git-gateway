'use strict';

const Controller = require('./node');

class TreeController extends Controller {
  /**
  * @api {get} /projects/:encoded_project_path/tree/:encoded_path get
  * @apiName GetTree
  * @apiGroup Tree
  * @apiDescription To get a tree
  * @apiPermission anyone
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'folder%2Ffolder'
  * @apiParam {Boolean} [recursive=false] Whether get all sub tree
  * @apiParam {Number} [page=1] Page number, only works if recursive = true
  * @apiParam {Number} [per_page=20] Items amount for a page, only works if recursive = true
  * @apiParam {Boolean} [refresh_cache=false]  Whether refresh the cache of this tree
  */
  async show() {
    const { ctx } = this;
    const {
      path, refresh_cache, recursive, project_path,
    } = ctx.params;
    const from_cache = !refresh_cache;
    const project = await this.getExistsProject(project_path);
    const tree = await ctx.model.Node
      .getTreeByPath(path, project._id, recursive, from_cache);
    ctx.body = tree;
  }

  async root() {
    const { ctx } = this;
    const { project_path, recursive, from_cache } = ctx.params;
    const project = await this.getExistsProject(project_path);
    const tree = await ctx.model.Node
      .getRootTree(project._id, recursive, from_cache);
    ctx.body = tree;
  }
}

module.exports = TreeController;
