'use strict';

const { assert } = require('egg-mock/bootstrap');
const { empty } = require('../../app/helper');

describe('test/app/helper.test.js', () => {
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
