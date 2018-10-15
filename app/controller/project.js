'use strict';

const Controller = require('../core/base_controller');
const { empty } = require('../lib/helper');

const create_rule = {
  sitename: 'string',
  site_id: { type: 'int', required: false },
  visibility: [ 'public', 'private' ],
};

const update_visibility_rule = {
  visibility: [ 'public', 'private' ],
};

class ProjectController extends Controller {
  async show() {
    const project_path = this.ctx.params.project_path;
    const project = await this.get_writable_project(project_path);
    const account = await this.get_account(project.account_id);
    if (!account.token) {
      const token = await this.service.gitlab.get_token(account._id);
      account.token = token;
      await account.save().catch(err => {
        const errMsg = 'Failed to get token';
        this.ctx.logger.error(err);
        this.ctx.throw(err.response.status, errMsg);
      });
    }
    project.token = account.token;
    project.createdAt = undefined;
    project.updatedAt = undefined;
    project.__v = undefined;
    this.ctx.body = project;
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
    this.ctx.ensureAdmin();
    this.ctx.validate(create_rule);
    const account = await this.ctx.model.Account
      .get_by_kw_username(this.ctx.params.kw_username)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    if (empty(account)) { this.ctx.throw(404, 'User not found'); }

    const project = await this.service.gitlab
      .create_project({
        name: this.ctx.request.body.sitename,
        visibility: this.ctx.request.body.visibility,
        account_id: account._id,
      }).catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(err.response.status, err.response.data);
      });

    project.sitename = this.ctx.request.body.sitename;
    project.path = `${this.ctx.params.kw_username}/${project.sitename}`;
    project.site_id = this.ctx.request.body.site_id;

    await this.ctx.model.Project
      .create(project)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    if (project.site_id) {
      const es_message = {
        action: 'create_site',
        site_id: project.site_id,
        username: account.username,
      };
      await this.send_message(project._id, es_message);
    }

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
    this.ctx.ensureAdmin();
    this.ctx.validate(update_visibility_rule);
    const project = await this.ctx.model.Project
      .get_by_path_from_db(this.ctx.params.path);
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }

    project.visibility = this.ctx.request.body.visibility;
    await this.service.gitlab
      .update_project_visibility(project._id, project.visibility)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await project.save().catch(err => {
      this.ctx.logger.error(err);
      this.ctx.throw(500);
    });

    const es_message = {
      action: 'update_site_visibility',
      path: project.path,
      visibility: project.visibility,
    };
    await this.send_message(project._id, es_message);

    this.ctx.body = {
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
    this.ctx.ensureAdmin();
    const project = await this.ctx.model.Project
      .get_by_path(
        this.ctx.params.path,
        false
      );
    if (empty(project)) { this.ctx.throw(404, 'Project not found'); }

    await this.ctx.model.Node
      .delete_project(project._id)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await this.service.gitlab
      .delete_project(project._id)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await this.ctx.model.Project
      .delete_and_release_cache(project.path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    const es_message = {
      action: 'remove_site',
      path: project.path,
    };
    await this.send_message(project._id, es_message);

    this.deleted();
  }

  async send_message(project_id, es_message) {
    const wrapped_es_message = this.service.kafka
      .wrap_elasticsearch_message(es_message, project_id);
    await this.service.kafka.send(wrapped_es_message)
      .catch(err => {
        this.ctx.logger.error(err);
      });
  }

  own_this_project(username, project_path) {
    return project_path.startsWith(`${username}/`);
  }

}

module.exports = ProjectController;
