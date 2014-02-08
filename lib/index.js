'use strict';

/**
 * Module dependencies.
 */

var CachemanError = require('./error')
  , Emitter = require('events').EventEmitter
  , ms = require('ms')
  , noop = function () {};

/**
 * Export `Cacheman`.
 */

module.exports = Cacheman;

/**
 * Valid store engines.
 *
 * @type {Array}
 * @api public
 */

Cacheman.engines = ['memory', 'redis', 'mongo', 'file'];

/**
 * Cacheman constructor.
 *
 * @param {String} name
 * @param {Object} options
 * @api public
 */

function Cacheman(name, options) {
  if (!(this instanceof Cacheman)) return new Cacheman(name, options);

  if ('string' !== typeof name) {
    throw new CachemanError('Invalid name format, name argument must be a String');
  }

  this.options = options || {};
  this.options.count = 1000;
  this._name = name;
  this._fns = [];
  this._ttl = this.options.ttl || 60;
  this.engine(this.options.engine || 'memory');
  this._prefix = 'cache:' + this._name + ':';
}

/**
 * Set get engine.
 *
 * @param {String} engine
 * @param {Object} options
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.engine = function _engine(engine, options) {
  
  if (!arguments.length) return this._engine;

  if (! /string|function/.test(typeof engine)) {
    throw new CachemanError('Invalid engine format, engine must be a String or Function');
  }

  if ('string' === typeof engine) {

    var Engine;

    if (~Cacheman.engines.indexOf(engine)) {
      engine = 'cacheman-' + engine;
    }

    try {
      Engine = require(engine);
    } catch(e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        throw new CachemanError('Missing required npm module ' + engine);
      } else {
        throw e;
      }
    }

    this._engine = new Engine(options || this.options, this);
  } else {
    this._engine = engine(options || this.options, this);
  }
  return this;
};

/**
 * Wrap key with prefix.
 *
 * @param {String} key
 * @return {String}
 * @api private
 */

Cacheman.prototype.key = function key(key) {
  return this._prefix + key;
};

/**
 * Sets up namespace middleware.
 *
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.use = function use(fn) {
  this._fns.push(fn);
  return this;
};

/**
 * Executes the cache middleware.
 *
 * @param {String} key
 * @param {Mixed} data
 * @param {Number} ttl
 * @param {Function} fn
 * @api private
 */

Cacheman.prototype.run = function run(key, data, ttl, fn) {
  var fns = this._fns.slice(0);
  if (!fns.length) return fn(null);

  function run(i) {
    fns[i](key, data, ttl, function next(err, _data, _ttl, _force) {
      // upon error, short-circuit
      if (err) return fn(err);

      // if no middleware left, summon callback
      if (!fns[i + 1]) return fn(null, _data, _ttl, _force);

      // go on to next
      run(i + 1);
    });
  }

  run(0);
};


Cacheman.keys

/**
 * Set an entry.
 *
 * @param {String} key
 * @param {Mixed} data
 * @param {Number} ttl
 * @param {Function} fn
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.cache = function cache(key, data, ttl, fn) {
  
  var cache = this;

  if ('function' === typeof ttl) {
    fn = ttl;
    ttl = null;
  }

  fn = fn || noop;

  cache.get(key, function get(err, res) {

    cache.run(key, res, ttl, function run(_err, _data, _ttl, _force) {

      if (err || _err) return fn(err || _err);

      var force = false;
      
      if ('undefined' !== typeof _data) {
        force = true;
        data = _data;
      }

      if ('undefined' !== typeof _ttl) {
        force = true;
        ttl = _ttl;
      }

      if ('undefined' === typeof res || force) {
        return cache.set(key, data, ttl, fn);
      }

      fn(null, res);

    });

  });

  return this;
};

/**
 * Get an entry.
 *
 * @param {String} key
 * @param {Function} fn
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.get = function get(key, fn) {
  fn = fn || noop;
  this._engine.get(this.key(key), fn);
  return this;
};

/**
 * Set an entry.
 *
 * @param {String} key
 * @param {Mixed} data
 * @param {Number} ttl
 * @param {Function} fn
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.set = function set(key, data, ttl, fn) {

  var cache = this;

  if ('function' === typeof ttl) {
    fn = ttl;
    ttl = null;
  }

  if (ttl) {
    if ('string' === typeof ttl) {
      ttl = Math.round(ms(ttl)/1000);
    }
  }

  fn = fn || noop;

  if ('undefined' === typeof data) {
    return process.nextTick(fn);
  }

  cache._engine.set(cache.key(key), data, ttl || cache._ttl, fn);

  return this;
};

/**
 * Delete an entry.
 *
 * @param {String} key
 * @param {Function} fn
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.del = function del(key, fn) {

  if ('function' === typeof key) {
    fn = key;
    key = '';
  }

  fn = fn || noop;

  this._engine.del(this.key(key), fn);
  return this;
};

/**
 * Clear all entries.
 *
 * @param {String} key
 * @param {Function} fn
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.clear = function clear(fn) {
  fn = fn || noop;
  this._engine.clear(this.key(''), fn);
  return this;
};
