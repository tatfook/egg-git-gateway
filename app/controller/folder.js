'use strict';

const Controller = require('./node');

const create_rule = {
  branch: { type: 'string', default: 'master', required: false },
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
    required: false,
  },
};

class FolderController extends Controller {
  /**
  * @api {post} /projects/:encoded_project_path/folders/:encoded_path create
  * @apiName CreateFolder
  * @apiGroup Folder
  * @apiDescription To create a folder
  * @apiPermission authorized user
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'folder%2Ffolder'
  */
  async create() {
    this.ctx.validate(create_rule);
    const path = this.ctx.params.path;
    const project = await this.get_writable_project();
    await this.throw_if_node_exist(project._id, path);
    await this.ensure_parent_exist(project.account_id, project._id, path);
    const folder = new this.ctx.model.Node({
      name: this.get_file_name(path),
      type: 'tree',
      path,
      project_id: project._id,
      account_id: project.account_id,
    });

    await folder.save().catch(err => {
      this.ctx.logger.error(err);
      this.ctx.throw(500);
    });

    this.created();
  }

  /**
  * @api {delete} /projects/:encoded_project_path/folders/:encoded_path remove
  * @apiName RemoveFolder
  * @apiGroup Folder
  * @apiDescription To remove a folder and all of its sub files
  * @apiPermission authorized user
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'folder%2Ffolder'
  */
  async remove() {
    const path = this.ctx.params.path;
    const project = await this.get_writable_project();
    const folder = await this.ctx.model.Node
      .get_by_path_from_db(project._id, path)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });
    await this.throw_if_not_exist(folder, 'tree');

    const sub_files = await this.ctx.model.Node
      .get_tree_by_path_from_db(
        project._id,
        this.ctx.params.path,
        true,
        { skip: 0, limit: 9999999 }
      );
    sub_files.push(folder);

    const commit_options = {
      commit_message: this.ctx.request.body.commit_message ||
        `${this.ctx.user.username} delete folder ${folder.path}`,
      author: this.ctx.user.username,
    };

    const commit = await this.ctx.model.Commit
      .delete_file(sub_files, project._id, commit_options)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await this.ctx.model.Node
      .delete_sub_files_and_release_cache(project._id, folder.path, sub_files)
      .catch(err => {
        this.ctx.logger.error(err);
        this.ctx.throw(500);
      });

    await this.send_message(commit._id, project._id);
    this.deleted();
  }
}

module.exports = FolderController;
