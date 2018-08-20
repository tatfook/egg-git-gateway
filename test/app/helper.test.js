'use strict';

const { assert } = require('egg-mock/bootstrap');
const { empty } = require('../../app/lib/helper');

describe('test/app/lib/helper.test.js', () => {
  it('should return true', () => {
    assert(empty());
  });

  it('should return true', () => {
    assert(empty({}));
  });

  it('should return false', () => {
    assert(!empty({ test: true }));
  });
});
