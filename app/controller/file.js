'use strict';

const Controller = require('../core/base_controller');
const _ = require('lodash/object');

const LATEST_FIELDS_TO_SHOW = [
  'version', 'source_version', 'author_name', 'createdAt',
];

const CREATE_RULE = {
  branch: { type: 'string', default: 'master', required: false },
  content: { type: 'string', required: false, allowEmpty: true },
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
    required: false,
  },
};

const CREATE_MANY_RULE = {
  branch: { type: 'string', default: 'master', required: false },
  files: {
    type: 'array',
    itemType: 'object',
    rule: {
      path: 'string',
      content: { type: 'string', required: false, allowEmpty: true },
    },
  },
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
    required: false,
  },
};

const UPDATE_RULE = {
  branch: { type: 'string', default: 'master', required: false },
  content: { type: 'string', allowEmpty: true },
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
  content: { type: 'string', required: false, allowEmpty: true },
  commit_message: { type: 'string', required: false },
  encoding: {
    type: 'enum',
    values: [ 'text', 'base64' ],
    default: 'text',
    required: false,
  },
};

class FileController extends Controller {
  /**
  * @api {get} /projects/:encoded_project_path/files/:encoded_path get
  * @apiName GetFile
  * @apiGroup File
  * @apiDescription To get a file
  * @apiPermission authorized user
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'folder%2Ffolder'
  * @apiParam {Boolean} [refresh_cache=false]  Whether refresh the cache of this file
  */
  async show() {
    const { ctx, service } = this;
    const { commit } = ctx.params;
    let project;
    let file;

    // 只有可编辑用户可获取commit信息
    if (commit) {
      project = await service.project.getWritableProject();
    } else {
      project = await service.project.getReadableProject();
    }

    // 如非master分支，则从gitlab获取
    // 如为master分支，先从本服务获取，如不存在则查询gitlab
    file = await service.node.getFromDBOrGitlab(project);

    // 如需要获取commit信息而数据库中没有，则从gitlab获取commit信息
    if (commit && !file.latest_commit) {
      file = await service.node.getFileWithCommits(file);
    }

    ctx.body = {
      _id: file._id,
      content: file.content || '',
    };
    if (commit) {
      ctx.body.commit = _.pick(file.latest_commit, LATEST_FIELDS_TO_SHOW);
    }
  }

  /**
  * @api {post} /projects/:encoded_project_path/files/:encoded_path create
  * @apiName CreateFile
  * @apiGroup File
  * @apiDescription To create a file
  * @apiPermission authorized user
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'folder%2Ffolder'
  * @apiParam {String} [content] Content of the file
  */
  async create() {
    const { ctx, service } = this;
    ctx.validate(CREATE_RULE);
    const { path, content } = ctx.params;
    const project = await service.project.getWritableProject();
    await service.node.ensureNodeNotExist(project._id, path);
    const nodes_to_create = await ctx.model.Node
      .getParentsNotExist(project.account_id, project._id, path);

    let file = {
      name: service.node.getFileName(path),
      content, path,
      project_id: project._id,
      account_id: project.account_id,
    };
    nodes_to_create.push(file);
    const files = await service.node.createAndCommit(true, ...nodes_to_create);
    file = files[files.length - 1];

    // 发送消息
    const message_options = service.node.getMessageOptions(project);
    const message = await ctx.model.Message
      .createFile(file, project._id, message_options);
    await service.node.sendMessage(message);
    this.created();
  }

  async createMany() {
    const { ctx, service } = this;
    ctx.validate(CREATE_MANY_RULE);
    const project = await service.project.getWritableProject();
    let { files } = ctx.params;
    service.node.ensureUnique(files);
    await service.node.ensureNodesNotExist(project._id, files);
    const ancestors_to_create = await ctx.model.Node
      .getParentsNotExist(project.account_id, project._id, files);
    for (const file of files) {
      file.name = service.node.getFileName(file.path);
      file.project_id = project._id;
      file.account_id = project.account_id;
    }

    const nodes_to_create = files.concat(ancestors_to_create);
    files = await service.node.createAndCommit(true, ...nodes_to_create);

    const message_options = service.node.getMessageOptions(project);
    const message = await ctx.model.Message
      .createFile(files, project._id, message_options);

    await service.node.sendMessage(message);
    this.created();
  }

  /**
  * @api {put} /projects/:encoded_project_path/files/:encoded_path update
  * @apiName UpdateFile
  * @apiGroup File
  * @apiDescription To update a file
  * @apiPermission authorized user
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'folder%2Ffolder'
  * @apiParam {String} content Content of the file
  */
  async update() {
    const { ctx, service } = this;
    ctx.validate(UPDATE_RULE);
    const { path, source_version, content } = ctx.params;
    const project = await service.project.getReadableProject();
    let file = await service.node.getExistsNode(project._id, path, false);
    file = await service.node.getFileWithCommits(file);

    file.set({ content });
    file.createCommit({ author_name: ctx.state.user.username, source_version });
    await file.save();

    const message_options = service.node.getMessageOptions(project);
    const message = await ctx.model.Message
      .updateFile(file, project._id, message_options);

    await service.node.sendMessage(message);
    this.updated({ commit: _.pick(file.latest_commit, LATEST_FIELDS_TO_SHOW) });
  }

  /**
  * @api {delete} /projects/:encoded_project_path/files/:encoded_path remove
  * @apiName RemoveFile
  * @apiGroup File
  * @apiDescription To remove a file
  * @apiPermission authorized
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'folder%2Ffolder'
  */
  async remove() {
    const { ctx, service } = this;
    const { path } = ctx.params;
    const project = await service.project.getWritableProject();
    const file = await service.node.getExistsNode(project._id, path, false);

    await ctx.model.Node.deleteAndReleaseCache(file);

    const message_options = service.node.getMessageOptions(project);
    const message = await ctx.model.Message
      .deleteFile(file, project._id, message_options);

    await service.node.sendMessage(message);
    this.deleted();
  }

  /**
  * @api {put} /projects/:encoded_project_path/files/:encoded_path/move move
  * @apiName MoveFile
  * @apiGroup File
  * @apiDescription To move a file
  * @apiPermission authorized user
  *
  * @apiParam {String} encoded_project_path Urlencoded encoded_project_path such as 'username%2Fsitename'
  * @apiParam {String} encoded_path Urlencoded tree path such as 'username%2Fsitename%2Fprevious%2Findex.md'
  * @apiParam {String} new_path New path of the file such as 'username/sitename/new/index.md'
  * @apiParam {String} [content] Content of the file
  */
  async move() {
    const { ctx, service } = this;
    ctx.validate(MOVE_RULE);
    const previous_path = ctx.params.path;
    const new_path = ctx.params.path = ctx.params.new_path;
    const project = await service.project.getWritableProject();
    let file = await service.node.getExistsNode(project._id, previous_path, false);
    file = await service.node.getFileWithCommits(file);
    await service.node.ensureNodeNotExist(project._id, new_path);
    await service.node.ensureParentExist(project.account_id, project._id, new_path);
    file = await service.node.getFileWithCommits(file);

    const { content } = ctx.params;
    if (content) file.content = content;
    file.previous_path = previous_path;
    file.path = new_path;
    file.previous_name = file.name;
    file.name = service.node.getFileName();

    file.createCommit({ author_name: ctx.state.user.username });
    await ctx.model.Node.move(file);

    const message_options = service.node.getMessageOptions(project);
    const message = await ctx.model.Message
      .moveFile(file, project._id, message_options);

    await service.node.sendMessage(message);
    this.moved();
  }
}

module.exports = FileController;
