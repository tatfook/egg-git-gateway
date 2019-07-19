'use strict';

const prefix = 'gitlab_unittest_';

module.exports = app => {
  const { factory } = app;
  factory.define('Account', app.model.Account, () => {
    const attrs = {
      _id: factory.chance('natural', { max: 10000 })(),
      kw_id: factory.chance('natural', { max: 10000 })(),
      kw_username: factory.chance('word', { length: 10 })(),
    };
    attrs.name = `${prefix}${attrs.kw_username}`;
    return attrs;
  });
};
