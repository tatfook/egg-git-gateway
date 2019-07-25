'use strict';

const Controller = require('../core/base_controller');
const { paginate } = require('../lib/helper');

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
    const { ctx, service } = this;
    const { refresh_cache, recursive, path, project_path } = ctx.params;
    const from_cache = !refresh_cache;
    const project = await service.project.getExistsProject(project_path);
    const tree = await ctx.model.Node
      .getTreeByPath(
        project._id, path,
        from_cache, recursive,
        paginate(ctx.params)
      );
    ctx.body = tree;
  }

  async root() {
    const { ctx, service } = this;
    const { project_path } = ctx.params;
    const project = await service.project.getExistsProject(project_path);
    const tree = await ctx.model.Node
      .getTreeByPath(
        project._id, null,
        false, true,
        paginate(ctx.params)
      );
    ctx.body = tree;
  }
}

module.exports = TreeController;
