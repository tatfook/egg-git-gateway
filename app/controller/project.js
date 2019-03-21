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
    const { path } = ctx.params;
    const project = await this.getProject(path);
    ctx.body = Number(!ctx.helper.isEmpty(project));
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
    const { username, sitename, site_id, visibility } = ctx.params;
    const repo_name = sitename;
    const path = `${username}/${repo_name}`;
    const account = await this.getExistsAccount({ username });
    const { storage_name, namespace } = account;
    await this.ensureProjectNotExist(path);

    const repo = await service.gitaly
      .createRepository(storage_name, namespace, repo_name);
    const project = {
      site_id, sitename, repo_name, path,
      visibility, repo_path: repo.relative_path,
      account,
    };
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
    const { ctx } = this;
    ctx.ensureAdmin();
    ctx.validate(update_visibility_rule);
    const { path, visibility } = ctx.params;
    const project = await this.getExistsProject(path, false);
    project.visibility = visibility;

    if (project.site_id) {
      const method = 'updateSiteVisibility';
      await this.sendMsg(project, method);
    }
    await project.save();
    this.updated();
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
  async destroy() {
    const { ctx, service } = this;
    ctx.ensureAdmin();
    const { path } = ctx.params;
    const project = await this.getExistsProject(path, false);
    const account = await this.getExistsAccount({ _id: project.account_id });
    const { storage_name, namespace } = account;
    const { repo_name } = project;

    // await ctx.model.Node
    //   .delete_project(project._id)
    //   .catch(err => {
    //     ctx.logger.error(err);
    //     ctx.throw(500);
    //   });

    if (project.site_id) {
      const method = 'deleteSite';
      await this.sendMsg(project, method);
    }
    await service.gitaly
      .cleanRepository(storage_name, namespace, repo_name);
    await project.remove();
    this.deleted();
  }

  async ensureProjectNotExist(project_path) {
    const project = await this.getProject(project_path);
    this.throwIfExists(project, 'Project already exists');
  }

  formatMsg(project, method) {
    const { ctx } = this;
    const { helper } = ctx;
    return {
      topic: this.config.kafka.topics.elasticsearch,
      messages: helper.project2Msg(project, method),
      key: project._id,
    };
  }

  async sendMsg(project, method) {
    const { service } = this;
    const payload = this.formatMsg(project, method);
    await service.kafka.send(payload);
  }
}

module.exports = ProjectController;
