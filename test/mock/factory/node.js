'use strict';

const faker = require('faker');

const FILE_TYPE = 'blob';
const FOLDER_TYPE = 'tree';

module.exports = app => {
  const { factory } = app;
  factory.define('Node', app.model.Node, async options => {
    let name;
    let path;
    let type;
    let content;

    const project = await factory.create('Project');

    if (options.isFolder) {
      name = faker.lorem.word();
      path = `${faker.lorem.word()}/${name}`;
      type = FOLDER_TYPE;
    } else {
      name = faker.system.fileName();
      path = `${faker.lorem.word()}/${faker.lorem.word()}/${name}`;
      content = faker.lorem.paragraphs();
      type = FILE_TYPE;
    }

    const commit_id = faker.random.uuid().split('-').join('');
    const short_id = commit_id.slice(0, 9);
    const author_name = faker.name.firstName();
    const message = `${author_name} create ${path}`;

    const commit = {
      commit_id, short_id, version: 1,
      author_name: faker.name.firstName(),
      message,
    };

    const attrs = {
      name, path,
      content, type,
      project_id: project._id,
      account_id: project.account_id,
      commits: [ commit ],
      latest_commit: commit,
    };

    return attrs;
  });
};
