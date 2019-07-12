'use strict';

const Controller = require('../core/base_controller');

const create_rule = {
  sitename: 'string',
  site_id: { type: 'int', required: false },
  visibility: [ 'public', 'private' ],
};

const update_visibility_rule = {
  visibility: [ 'public', 'private' ],
};

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
    const { ctx } = this;
    ctx.ensureAdmin();
    const project = await this.get_project(ctx.params.path);
    if (ctx.helper.empty(project)) {
      ctx.body = 0;
    } else {
      ctx.body = 1;
    }
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
    ctx.validate(create_rule);
    const kw_username = ctx.params.kw_username;
    const sitename = ctx.params.sitename;
    const project_path = `${kw_username}/${sitename}`;
    const account = await this.get_existing_account({ kw_username });
    await this.ensure_project_not_exist(project_path);
    const project = await service.gitlab
      .create_project({
        name: sitename,
        visibility: ctx.params.visibility,
        account_id: account._id,
      }).catch(err => {
        ctx.logger.error(err);
        ctx.throw(err.response.status, err.response.data);
      });
    project.sitename = sitename;
    project.path = project_path;
    project.site_id = ctx.params.site_id;
    await ctx.model.Project
      .create(project)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
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
  async update_visibility() {
    const { ctx, service } = this;
    ctx.ensureAdmin();
    ctx.validate(update_visibility_rule);
    const project = await this.get_existing_project(ctx.params.path, false);
    project.visibility = ctx.params.visibility;
    await service.gitlab
      .update_project_visibility(project._id, project.visibility)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await project.save().catch(err => {
      ctx.logger.error(err);
      ctx.throw(500);
    });

    if (project.site_id) {
      const method_to_call = 'updateSiteVisibility';
      await this.send_message(project, method_to_call);
    }

    ctx.body = {
      site_id: project.site_id,
      visibility: project.visibility,
    };
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
    const project = await this.get_existing_project(ctx.params.path, false);
    await ctx.model.Node
      .delete_project(project._id)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await service.gitlab
      .delete_project(project._id)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await ctx.model.Project
      .delete_and_release_cache(project.path)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    if (project.site_id) {
      const method_to_call = 'deleteSite';
      await this.send_message(project, method_to_call);
    }

    this.deleted();
  }

  async getCommits() {
    const { ctx, service } = this;
    const { path, file_path } = ctx.params;
    const { skip, limit } = ctx.helper.paginate(ctx.params);
    const project = await this.get_readable_project(path, false);
    const { commit, total } = await service.node
      .getCommits(project._id, file_path, skip, limit);
    ctx.body = { commit, total };
  }

  async ensure_project_not_exist(project_path) {
    const project = await this.get_project(project_path);
    this.throw_if_exists(project, 'Project already exists');
  }

  wrap_message(project, method) {
    const { ctx } = this;
    const { helper } = ctx;
    return {
      topic: this.config.kafka.topics.elasticsearch,
      messages: helper.project_to_message(project, method),
      key: project._id,
    };
  }

  async send_message(project, method) {
    const { ctx, service } = this;
    const payload = this.wrap_message(project, method);
    await service.kafka.send(payload)
      .catch(err => {
        ctx.logger.error(err);
      });
  }
}

module.exports = ProjectController;
