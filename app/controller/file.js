'use strict';

const Controller = require('./node');
// const { isEmpty } = require('../lib/helper');

const create_rule = {
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

const create_many_rule = {
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

const update_rule = {
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

const move_rule = {
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
    const { ctx } = this;
    const project = await this.getReadableProject();
    const { path, refresh_cache } = ctx.params;
    const from_cache = !refresh_cache;
    const file = await this.getNode(project._id, path, from_cache);
    // todo: load blob from gitaly
    // if (isEmpty(file)) file = await this.loadFromGitaly(project);
    ctx.body = { content: file.content || '' };
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
    const { ctx } = this;
    ctx.validate(create_rule);
    const { path, content } = ctx.params;
    const project = await this.getWritableProject();
    await this.ensureNodeNotExist(project._id, path);

    const nodes_to_create = await ctx.model.Node
      .getParentsNotExist(project.account_id, project._id, path);
    const name = this.getNodeName(path);
    const parent_path = this.getParentPath(path);
    const file = ctx.model.Node({
      name, content, path, parent_path,
      project_id: project._id, account_id: project.account_id,
    });
    nodes_to_create.push(file);

    await ctx.model.Node.create(nodes_to_create);
    const commit_options = this.getCommitOptions(project);
    const commit = await ctx.model.Commit
      .createFile(file, project._id, commit_options);
    await this.sendMsg(commit);

    this.created();
  }

  async create_many() {
    const { ctx } = this;
    ctx.validate(create_many_rule);
    const project = await this.getWritableProject();
    let { files } = ctx.params;
    this.ensureUnique(files);
    await this.ensureNodesNotExist(project._id, files);
    const ancestors_to_create = await ctx.model.Node
      .getParentsNotExist(project.account_id, project._id, files);
    for (const file of files) {
      file.name = this.getNodeName(file.path);
      file.parent_path = this.getParentPath(file.path);
      file.project_id = project._id;
      file.account_id = project.account_id;
    }

    const nodes_to_create = files.concat(ancestors_to_create);
    files = await ctx.model.Node.create(nodes_to_create);
    const commit_options = this.getCommitOptions(project);
    const commit = await ctx.model.Commit
      .createFile(files, project._id, commit_options);
    await this.sendMsg(commit);

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
    const { ctx } = this;
    ctx.validate(update_rule);
    const { path, content } = ctx.params;
    const project = await this.getWritableProject();
    const file = await this.getExistsNode(project._id, path, false);
    file.set({ content });

    await file.save();
    const commit_options = this.getCommitOptions(project);
    const commit = await ctx.model.Commit
      .updateFile(file, project._id, commit_options);
    await this.sendMsg(commit);

    this.updated();
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
  async destroy() {
    const { ctx } = this;
    const { path, commit_message } = ctx.params;
    const project = await this.getWritableProject();
    const file = await this.getExistsNode(project._id, path, false);

    await file.remove();
    const commit_options = {
      commit_message,
      author: ctx.state.user.username,
      visibility: project.visibility,
    };
    const commit = await ctx.model.Commit
      .deleteFile(file, project._id, commit_options);
    await this.sendMsg(commit);

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
    const { ctx } = this;
    ctx.validate(move_rule);
    const previous_path = ctx.params.path;
    const new_path = ctx.params.path = ctx.params.new_path;
    const project = await this.getWritableProject();
    const file = await this.getExistsNode(project._id, previous_path, false);
    await this.ensureNodeNotExist(project._id, new_path);
    await this.ensureParentExist(project.account_id, project._id, new_path);

    const { content } = ctx.params;
    if (content !== undefined) { file.content = content; }
    file.previous_path = previous_path;
    file.path = new_path;
    file.previous_name = file.name;
    file.name = this.getNodeName();
    file.parent_path = this.getParentPath(file.path);

    await file.save();
    const commit_options = this.getCommitOptions(project);
    const commit = await ctx.model.Commit
      .moveFile(file, project._id, commit_options);
    await this.sendMsg(commit);

    this.moved();
  }

  async dump() {
    const { ctx } = this;
    const file = await this.loadFromGitaly();
    ctx.body = { content: file.content };
  }

  async loadFromGitaly(project) {
    // const { ctx, service } = this;
    // if (!project) project = await this.getExistsProject();
    console.log(project);
    this.throwIfNotExist({});
    // todo: const file = await service.gitaly.getBlob();
    // file.path = ctx.params.path;
    // file.name = this.getNodeName(file.path);
    // file.project_id = project._id;
    // file.account_id = project.account_id;
    // await ctx.model.Node.create(file);
    // return file;
  }
}

module.exports = FileController;
