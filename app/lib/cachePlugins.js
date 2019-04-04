'use strict';

const {
  node2Str,
  getNodeKey,
} = require('./helper');

const getCacheNodePlugin = app => {
  const { redis, config } = app;
  const expire = config.cache_expire;
  const cachePlugin = schema => {
    const { statics } = schema;
    statics.cacheNode = async node => {
      const key = getNodeKey(node);
      const content = node2Str(node);
      await redis.setex(key, expire, content);
    };
  };
  return cachePlugin;
};

const getCacheProjectPlugin = app => {
  const { redis, config } = app;
  const expire = config.cache_expire;
  const cachePlugin = schema => {
    const { statics, methods } = schema;
    statics.cacheNode = async function(node) {
      const key = getNodeKey(node);
      const content = node2Str(node);
      await redis.setex(key, expire, content);
      return node;
    };

    methods.cache = async function() {
      return await statics.cacheNode(this);
    };
  };
  return cachePlugin;
};

const getCacheAccountPlugin = app => {
  const { redis, config } = app;
  const expire = config.cache_expire;
  const cachePlugin = schema => {
    const { statics } = schema;
    statics.cacheNode = async node => {
      const key = getNodeKey(node);
      const content = node2Str(node);
      await redis.setex(key, expire, content);
    };
  };
  return cachePlugin;
};

module.exports = {
  getCacheNodePlugin,
  getCacheProjectPlugin,
  getCacheAccountPlugin,
};
