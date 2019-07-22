'use strict';

module.exports = app => {
  const { factory } = app;
  factory.define('Project', app.model.Project, async () => {
    const account = await factory.create('Account');
    const sitename = factory.chance('word', { length: 10 })();
    const { kw_username, name } = account;
    const path = `${kw_username}/${sitename}`;
    const git_path = `${name}/${sitename}`;

    const attrs = {
      _id: factory.chance('natural', { max: 10000 })(),
      visibility: 'public',
      name: sitename,
      site_id: factory.chance('natural', { max: 10000 })(),
      sitename, path, git_path,
      account_id: account._id,
    };
    return attrs;
  });
};
