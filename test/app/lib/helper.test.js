'use strict';

const { assert } = require('egg-mock/bootstrap');
const { empty, cycleInt } = require('../../../app/lib/helper');

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

  it('should return a generator of cycle int', () => {
    const less_than = 5;
    const cycle_int_gen = cycleInt(less_than);
    assert(cycle_int_gen.next().value === 0);
    assert(cycle_int_gen.next().value === 1);
    assert(cycle_int_gen.next().value === 2);
    assert(cycle_int_gen.next().value === 3);
    assert(cycle_int_gen.next().value === 4);
    assert(cycle_int_gen.next().value === 0);
  });
});
