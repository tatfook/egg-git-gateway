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
    const project = await this.getWritableProject();
    await this.ensureNodeNotExist(project._id, path);
    await this.ensureParentExist(project.account_id, project._id, path);
    const folder = new ctx.model.Node({
      name: this.getNodeName(path),
      parent_path: this.getParentPath(path),
      type: 'tree', path, project_id: project._id,
      account_id: project.account_id,
    });

    await folder.save();

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
    const { path } = ctx.params;
    const project = await this.getWritableProject();
    const folder = await this.getExistsNode(project._id, path, false);
    const nodes = await ctx.model.Node.getTreeByPath(path, project._id, true);
    nodes.push(folder);

    const commit_options = {
      commit_message: ctx.params.commit_message ||
        `${ctx.state.user.username} delete folder ${folder.path}`,
      author: ctx.state.user.username,
      visibility: project.visibility,
    };

    const commit = await ctx.model.Commit
      .deleteFile(nodes, project._id, commit_options);
    await ctx.model.Node.deleteNodes(nodes);
    await this.sendMsg(commit);

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
    const project = await this.getWritableProject();
    const folder = await this.getExistsNode(project._id, previous_path, false);
    await this.ensureNodeNotExist(project._id, new_path);
    await this.ensureParentExist(project.account_id, project._id, new_path);

    folder.path = new_path;
    folder.previous_path = previous_path;
    folder.previous_name = folder.name;
    folder.name = this.getNodeName(new_path);
    folder.parent_paht = this.getParentPath(new_path);

    const nodes = await ctx.model.Node.getTreeByPath(previous_path, project._id, true);

    const pattern = new RegExp(`^${previous_path}`, 'u');
    for (const file of nodes) {
      file.previous_path = file.path;
      file.path = file.path.replace(pattern, new_path);
      file.parent_path = this.getParentPath(file.path);
    }
    nodes.push(folder);

    await ctx.model.Node.updateNodes(nodes);
    const commit_options = this.getCommitOptions(project);
    const commit = await ctx.model.Commit
      .moveFile(nodes, project._id, commit_options);
    await this.sendMsg(commit);

    this.moved();
  }
}

module.exports = FolderController;
