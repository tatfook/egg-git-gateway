'use strict';

const Controller = require('./node');
const { empty } = require('../lib/helper');

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
    const project = await this.get_readable_project();
    const path = ctx.params.path;
    const from_cache = !ctx.params.refresh_cache;
    let file = await this.get_node(project._id, path, from_cache);
    if (empty(file)) { file = await this.load_from_gitlab(project); }
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
    const path = ctx.params.path;
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
      .create(nodes_to_create)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
    file = files[files.length - 1];

    const commit_options = this.get_commit_options(project);
    const commit = await ctx.model.Commit
      .create_file(file, project._id, commit_options)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await this.send_message(commit);
    this.created();
  }

  async create_many() {
    const { ctx } = this;
    ctx.validate(create_many_rule);
    const project = await this.get_writable_project();
    let files = ctx.params.files;
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
      .create(nodes_to_create)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    const commit_options = this.get_commit_options(project);
    const commit = await ctx.model.Commit
      .create_file(files, project._id, commit_options)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await this.send_message(commit);
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
    const path = ctx.params.path;
    const project = await this.get_writable_project();
    const file = await this.get_existing_node(project._id, path, false);
    file.set({ content: ctx.params.content });

    await file.save().catch(err => {
      ctx.logger.error(err);
      ctx.throw(500);
    });

    const commit_options = this.get_commit_options(project);
    const commit = await ctx.model.Commit
      .update_file(file, project._id, commit_options)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await this.send_message(commit);
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
  async remove() {
    const { ctx } = this;
    const path = ctx.params.path;
    const project = await this.get_writable_project();
    const file = await this.get_existing_node(project._id, path, false);

    await ctx.model.Node
      .delete_and_release_cache(file)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    const commit_options = {
      commit_message: ctx.params.commit_message,
      author: ctx.state.user.username,
      visibility: project.visibility,
    };
    const commit = await ctx.model.Commit
      .delete_file(file, project._id, commit_options)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await this.send_message(commit);
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
    const project = await this.get_writable_project();
    const file = await this.get_existing_node(project._id, previous_path, false);
    await this.ensure_node_not_exist(project._id, new_path);
    await this.ensure_parent_exist(project.account_id, project._id, new_path);

    const content = ctx.params.content;
    if (content) { file.content = content; }
    file.previous_path = previous_path;
    file.path = new_path;
    file.previous_name = file.name;
    file.name = this.get_file_name();

    await ctx.model.Node
      .move(file).catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    const commit_options = this.get_commit_options(project);
    const commit = await ctx.model.Commit
      .move_file(file, project._id, commit_options)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });

    await this.send_message(commit);
    this.moved();
  }

  async dump() {
    const { ctx } = this;
    const file = await this.load_from_gitlab();
    ctx.body = { content: file.content };
  }

  async load_from_gitlab(project) {
    const { ctx, service } = this;
    if (!project) { project = await this.get_existing_project(); }
    const file = await service.gitlab
      .load_raw_file(project.git_path, ctx.params.path)
      .catch(err => {
        ctx.logger.error(err);
        if (err.response.status === 404) {
          this.throw_if_node_not_exist();
        }
        ctx.throw(500);
      });
    file.path = ctx.params.path;
    file.name = this.get_file_name(file.path);
    file.project_id = project._id;
    file.account_id = project.account_id;
    await ctx.model.Node.create(file)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
    return file;
  }

  async migrate() {
    const { ctx } = this;
    ctx.ensureAdmin();
    ctx.validate(create_rule);
    const path = ctx.params.path;
    const project = await this.get_project();
    await this.ensure_node_not_exist(project._id, path);
    const ancestors_to_create = await ctx.model.Node
      .get_parents_not_exist(project.account_id, project._id, path);
    const file = {
      name: this.get_file_name(path),
      content: ctx.params.content,
      path,
      project_id: project._id,
      account_id: project.account_id,
    };
    const nodes_to_create = ancestors_to_create.push(file);
    await ctx.model.Node
      .create(nodes_to_create)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
    this.created();
  }

  async migrate_many() {
    const { ctx } = this;
    ctx.ensureAdmin();
    ctx.validate(create_many_rule);
    const project = await this.get_project();
    const files = ctx.params.files;
    this.ensure_unique(files);
    const ancestors_to_create = await ctx.model.Node
      .get_parents_not_exist(project.account_id, project._id, files);
    for (const file of files) {
      file.name = this.get_file_name(file.path);
      file.project_id = project._id;
      file.account_id = project.account_id;
    }
    const nodes_to_create = files.concat(ancestors_to_create);
    await ctx.model.Node
      .create(nodes_to_create)
      .catch(err => {
        ctx.logger.error(err);
        ctx.throw(500);
      });
    this.created();
  }
}

module.exports = FileController;
