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

const move_rule = {
  new_path: 'string',
  branch: { type: 'string', default: 'master', required: false },
  content: { type: 'string', required: false },
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
    const { ctx } = this;
    ctx.validate(create_rule);
    const path = ctx.params.path;
    const project = await this.get_writable_project();
    await this.ensure_node_not_exist(project._id, path);
    await this.ensure_parent_exist(project.account_id, project._id, path);
    const folder = new ctx.model.Node({
      name: this.get_file_name(path),
      type: 'tree',
      path,
      project_id: project._id,
      account_id: project.account_id,
    });

    await folder.save().catch(err => {
      ctx.logger.error(err);
      ctx.throw(500);
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
    const { ctx } = this;
    const path = ctx.params.path;
    const project = await this.get_writable_project();
    const folder = await this.get_existing_node(project._id, path, false);
    const subfiles = await ctx.model.Node
      .get_tree_by_path_from_db(
        project._id,
        ctx.params.path,
        true,
        { skip: 0, limit: 9999999 }
      );
    subfiles.push(folder);

    const message_options = {
      commit_message: ctx.params.commit_message ||
        `${ctx.state.user.username} delete folder ${folder.path}`,
      author: ctx.state.user.username,
      visibility: project.visibility,
    };

    const message = await ctx.model.Message
      .delete_file(subfiles, project._id, message_options)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await ctx.model.Node
      .delete_subfiles_and_release_cache(project._id, folder.path, subfiles)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await this.send_message(message);
    this.deleted();
  }

  /**
  * @api {put} /projects/:encoded_project_path/folders/:encoded_path/move move
  * @apiName MoveFolder
  * @apiGroup Folder
  * @apiDescription To move a folder
  * @apiPermission authorized user
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded folder path such as 'username%2Fsitename%2Fprevious'
  * @apiParam {String} new_path New path of the folder such as 'username/sitename/new'
  */
  async move() {
    const { ctx } = this;
    ctx.validate(move_rule);
    const previous_path = ctx.params.path;
    const new_path = ctx.params.path = ctx.params.new_path;
    const project = await this.get_writable_project();
    const folder = await this.get_existing_node(project._id, previous_path, false);
    await this.ensure_node_not_exist(project._id, new_path);
    await this.ensure_parent_exist(project.account_id, project._id, new_path);

    folder.path = new_path;
    folder.previous_path = previous_path;
    folder.previous_name = folder.name;
    folder.name = this.get_file_name();

    const subfiles = await ctx.model.Node
      .get_subfiles_by_path(project._id, previous_path, null, false)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    const pattern = new RegExp(`^${previous_path}`, 'u');
    for (const file of subfiles) {
      file.previous_path = file.path;
      file.path = file.path.replace(pattern, new_path);
    }
    subfiles.push(folder);

    const tasks = subfiles.map(file => { return file.save(); });
    await Promise.all(tasks)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    const message_options = this.get_message_options(project);
    const message = await ctx.model.Message
      .move_file(subfiles, project._id, message_options)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await this.send_message(message);
    this.moved();
  }
}

module.exports = FolderController;
