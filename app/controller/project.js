
'use strict';

const Controller = require('../core/base_controller');
const _ = require('lodash');

const CREATE_RULE = {
  sitename: 'string',
  site_id: { type: 'int', required: false },
  visibility: [ 'public', 'private' ],
};

const UPDATE_VISIBILITY_RULE = {
  visibility: [ 'public', 'private' ],
};

const UPDATE_VISIBILITY_METHOD = 'updateSiteVisibility';
const DELETE_SITE_METHOD = 'deleteSite';

const SITE_ID_AND_VISIBILITY_FIELD = [ 'site_id', 'visibility' ];
const COMMIT_FIELD_TO_RESPONSE = [ 'commits', 'total' ];

class ProjectController extends Controller {
  /**
 * @api {get} /projects/:encoded_path/exist check existence
 * @apiName exist
 * @apiGroup Project
 * @apiDescription To check the existence of a project
 * @apiPermission admin
 *
 * @apiParam {String} encoded_path Urlencoded path of a project.Like 'username%2Fproject_name'
 */
  async exist() {
    const { ctx, service } = this;
    const { path } = ctx.params;
    ctx.ensureAdmin();
    const project = await service.project.getByPath(path);
    ctx.body = Number(_.isEmpty(project));
  }

  /**
 * @api {post} /projects/user/:username create
 * @apiName CreateProject
 * @apiGroup Project
 * @apiDescription To create a git project
 * @apiPermission admin
 *
 * @apiParam {String} username Username of the project owner
 * @apiParam {String} sitename Name of the website
 * @apiParam {String{public, private}} visibility Visibility of the project
 * @apiParam {Number} [site_id] Id of the website in keepwork.When the
 * project is bound to a website,it is required.
 */
  async create() {
    const { ctx, service } = this;
    ctx.ensureAdmin();
    ctx.validate(CREATE_RULE);
    const { kw_username, sitename, site_id } = ctx.params;
    const path = `${kw_username}/${sitename}`;
    const account = await service.account.getExistsAccount({ kw_username });
    await service.project.ensureProjectNotExist(path);
    const project = await service.project.createGitlabProject(account._id);
    _.assign(project, { sitename, path, site_id });
    await ctx.model.Project.create(project);
    this.created();
  }

  /**
 * @api {put} /projects/:encoded_path/visibility update visibility
 * @apiName UpdateVisibility
 * @apiGroup Project
 * @apiDescription To update the visibility of a project
 * @apiPermission admin
 *
 * @apiParam {String} encoded_path Urlencoded path of a project.Like 'username%2Fproject_name'
 * @apiParam {String="public", "private"} visibility Visibility of the website
 */
  async updateVisibility() {
    const { ctx, service } = this;
    const { path, visibility } = ctx.params;
    ctx.ensureAdmin();
    ctx.validate(UPDATE_VISIBILITY_RULE);
    const project = await service.project.getExistsProject(path, false);
    project.visibility = visibility;
    await service.gitlab.updateProjectVisibility(project._id, visibility);
    await project.save();

    if (project.site_id) {
      const method = UPDATE_VISIBILITY_METHOD;
      await service.project.sendMessage(project, method);
    }
    ctx.body = _.pick(project, SITE_ID_AND_VISIBILITY_FIELD);
  }

  /**
 * @api {delete} /projects/:encoded_path remove
 * @apiName RemoveProject
 * @apiGroup Project
 * @apiDescription To remove a project
 * @apiPermission admin
 *
 * @apiParam {String} encoded_path Urlencoded path of a project.Like 'username%2Fproject_name'
 */
  async remove() {
    const { ctx, service } = this;
    ctx.ensureAdmin();
    const { path } = ctx.params;
    const project = await service.project.deleteByPath(path);
    if (project.site_id) {
      const method = DELETE_SITE_METHOD;
      await service.project.sendMessage(project, method);
    }
    this.deleted();
  }

  async getCommits() {
    const { ctx, service } = this;
    const { path, file_path } = ctx.params;
    const { skip, limit } = ctx.helper.paginate(ctx.params);
    const project = await service.project.getReadableProject(path, false);
    const commitsDetail = await service.node
      .getCommits(project._id, file_path, skip, limit);
    ctx.body = _.pick(commitsDetail, COMMIT_FIELD_TO_RESPONSE);
  }
}

module.exports = ProjectController;
