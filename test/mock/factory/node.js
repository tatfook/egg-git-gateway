'use strict';

const faker = require('faker');

module.exports = app => {
  const { factory } = app;
  factory.define('Node', app.model.Node, async () => {
    const project = await factory.create('Project');
    const name = faker.system.fileName();
    const path = `${faker.lorem.word()}/${faker.lorem.word()}/${name}`;

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
      content: faker.lorem.paragraphs(),
      type: 'blob',
      project_id: project._id,
      account_id: project.account_id,
      commits: [ commit ],
      latest_commit: commit,
    };
    return attrs;
  });
};
