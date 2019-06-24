'use strict';

const Controller = require('./node');
const _ = require('lodash/object');

const DEFAULT_BRANCH = 'master';
const PENDING_TIP = 'pending';
const ERROR_COMMIT_PENDING = 'Commit is pending';
const CODE_NOT_FOUND = 404;
const LATEST_FIELDS_TO_SHOW = [ 'version', 'createdAt' ];

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
    const { ctx, service } = this;
    const { path, refresh_cache, ref = DEFAULT_BRANCH, commit } = ctx.params;

    let project;
    if (commit) {
      project = await this.get_writable_project();
    } else {
      project = await this.get_readable_project();
    }

    const from_cache = !refresh_cache;
    let file;
    if (ref !== DEFAULT_BRANCH) {
      if (ref === PENDING_TIP) ctx.throw(CODE_NOT_FOUND, ERROR_COMMIT_PENDING);
      file = await service.gitlab.load_file(project._id, path, ref)
        .catch(err => {
          if (err.response.status === CODE_NOT_FOUND) {
            ctx.throw(err.response.status, err.response.data.message);
          }
        });
    } else {
      file = await this.get_node(project._id, path, from_cache);
      file = file || await this.load_from_gitlab(project);
    }

    if (commit && !file.latest_commit) {
      const result = await service.node.getCommits(project._id, path);
      file = result.file;
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
    const { ctx } = this;
    ctx.validate(create_rule);
    const { path } = ctx.params;
    const project = await this.get_writable_project();
    await this.ensure_node_not_exist(project._id, path);
    const nodes_to_create = await ctx.model.Node
      .get_parents_not_exist(project.account_id, project._id, path);
    let file = {
      name: this.get_file_name(path),
      content: ctx.params.content,
      path,
      project_id: project._id,
      account_id: project.account_id,
    };

    nodes_to_create.push(file);
    const files = await ctx.model.Node
      .create(nodes_to_create);
    file = files[files.length - 1];

    const message_options = this.get_message_options(project);
    const message = await ctx.model.Message
      .create_file(file, project._id, message_options);

    await this.send_message(message);
    this.created();
  }

  async create_many() {
    const { ctx } = this;
    ctx.validate(create_many_rule);
    const project = await this.get_writable_project();
    let { files } = ctx.params;
    this.ensure_unique(files);
    await this.ensure_nodes_not_exist(project._id, files);
    const ancestors_to_create = await ctx.model.Node
      .get_parents_not_exist(project.account_id, project._id, files);
    for (const file of files) {
      file.name = this.get_file_name(file.path);
      file.project_id = project._id;
      file.account_id = project.account_id;
    }

    const nodes_to_create = files.concat(ancestors_to_create);
    files = await ctx.model.Node
      .create(nodes_to_create);

    const message_options = this.get_message_options(project);
    const message = await ctx.model.Message
      .create_file(files, project._id, message_options);

    await this.send_message(message);
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
    ctx.validate(update_rule);
    const { path } = ctx.params;
    const project = await this.get_readable_project();
    let file = await this.get_existing_node(project._id, path, false);
    file = await service.node.getFileWithCommits(file);

    file.set({ content: ctx.params.content });
    file.createCommit({ author: ctx.state.user.username });
    await file.save();

    const message_options = this.get_message_options(project);
    const message = await ctx.model.Message
      .update_file(file, project._id, message_options);

    await this.send_message(message);
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
    const { ctx } = this;
    const { path } = ctx.params;
    const project = await this.get_writable_project();
    const file = await this.get_existing_node(project._id, path, false);

    await ctx.model.Node
      .delete_and_release_cache(file);

    const message_options = this.get_message_options(project);
    const message = await ctx.model.Message
      .delete_file(file, project._id, message_options);

    await this.send_message(message);
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
    ctx.validate(move_rule);
    const previous_path = ctx.params.path;
    const new_path = ctx.params.path = ctx.params.new_path;
    const project = await this.get_writable_project();
    let file = await this.get_existing_node(project._id, previous_path, false);
    file = await service.node.getFileWithCommits(file);
    await this.ensure_node_not_exist(project._id, new_path);
    await this.ensure_parent_exist(project.account_id, project._id, new_path);
    file = await service.node.getFileWithCommits(file);

    const { content } = ctx.params;
    if (content) { file.content = content; }
    file.previous_path = previous_path;
    file.path = new_path;
    file.previous_name = file.name;
    file.name = this.get_file_name();

    file.createCommit({ author: ctx.state.user.username });
    await ctx.model.Node.move(file);

    const message_options = this.get_message_options(project);
    const message = await ctx.model.Message
      .move_file(file, project._id, message_options);

    await this.send_message(message);
    this.moved();
  }

  async load_from_gitlab(project) {
    const { ctx, service } = this;
    if (!project) { project = await this.get_existing_project(); }
    const file = await service.gitlab
      .load_raw_file(project.git_path, ctx.params.path)
      .catch(err => {
        ctx.logger.error(err);
        if (err.response.status === CODE_NOT_FOUND) {
          this.throw_if_node_not_exist();
        }
        ctx.throw(500);
      });
    file.path = ctx.params.path;
    file.name = this.get_file_name(file.path);
    file.project_id = project._id;
    file.account_id = project.account_id;
    await ctx.model.Node.create(file);
    return file;
  }
}

module.exports = FileController;
