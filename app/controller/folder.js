'use strict';

const Controller = require('../core/base_controller');

const CREATE_RULE = {
  branch: { type: 'string', default: 'master', required: false },
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
    required: false,
  },
};

const MOVE_RULE = {
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
    const { ctx, service } = this;
    ctx.validate(CREATE_RULE);
    const path = ctx.params.path;
    const project = await service.project.getWritableProject();
    await service.node.ensureNodeNotExist(project._id, path);
    await service.node.ensureParentExist(project.account_id, project._id, path);
    const folder = new ctx.model.Node({
      name: service.node.getFileName(path),
      type: 'tree',
      path,
      project_id: project._id,
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
    const { ctx, service } = this;
    const { path } = ctx.params;
    const project = await service.project.getWritableProject();
    const folder = await service.node.getExistsNode(project._id, path, false);
    const subfiles = await ctx.model.Node
      .getTreeByPathFromDB(
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
      .deleteFile(subfiles, project._id, message_options);

    await ctx.model.Node
      .deleteSubfilesAndReleaseCache(project._id, folder.path, subfiles);

    await service.node.sendMessage(message);
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
    const { ctx, service } = this;
    ctx.validate(MOVE_RULE);
    const previous_path = ctx.params.path;
    const new_path = ctx.params.path = ctx.params.new_path;
    const project = await service.project.getWritableProject();
    const folder = await service.node.getExistsNode(project._id, previous_path, false);
    await service.node.ensureNodeNotExist(project._id, new_path);
    await service.node.ensureParentExist(project.account_id, project._id, new_path);

    folder.path = new_path;
    folder.previous_path = previous_path;
    folder.previous_name = folder.name;
    folder.name = service.node.getFileName();

    let subfiles = await ctx.model.Node
      .getSubfilesByPath(project._id, previous_path, null, false);

    subfiles = await Promise.all(subfiles.map(file => {
      return service.node.getFileWithCommits(file);
    }));

    const pattern = new RegExp(`^${previous_path}`, 'u');
    for (const file of subfiles) {
      file.previous_path = file.path;
      file.path = file.path.replace(pattern, new_path);
    }
    subfiles.push(folder);

    const tasks = subfiles.map(file => {
      file.createCommit({ author: ctx.state.user.username });
      return file.save();
    });
    await Promise.all(tasks);

    const message_options = service.node.getMessageOptions(project);
    const message = await ctx.model.Message
      .moveFile(subfiles, project._id, message_options);

    await service.node.sendMessage(message);
    this.moved();
  }
}

module.exports = FolderController;
