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

  if (name && 'object' === typeof name) {
    options = name;
    name = null;
  }

  this.options = options || {};
  this.options.count = 1000;
  this.options.prefix = this.options.prefix || 'cache';
  this.options.delimiter = this.options.delimiter || ':';
  this._name = name || '';
  this._fns = [];
  this._ttl = this.options.ttl || 60;
  this.engine(this.options.engine || 'memory');
  this._prefix = this.options.prefix + this.options.delimiter + this._name + this.options.delimiter;
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

  var type = typeof engine;

  if (! /string|function|object/.test(type)) {
    throw new CachemanError('Invalid engine format, engine must be a String, Function or a valid engine instance');
  }

  if ('string' === type) {

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

  } else if ('object' === type) {
    var fns = ['get', 'set', 'del', 'clear'];
    for (var i = 0; i < fns.length; ++i) {
      if ('function' !== typeof engine[fns[i]]) {
        throw new CachemanError('Invalid engine format, must be a valid engine instance');
      }
    }

    this._engine = engine;

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

Cacheman.prototype.key = function _key(key) {
  return this._prefix + key;
};

/**
 * Sets up namespace middleware.
 *
 * @return {Cacheman} self
 * @api public
 */

Cacheman.prototype.use = function _use(fn) {
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

Cacheman.prototype.run = function _run(key, data, ttl, fn) {
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

Cacheman.prototype.cache = function _cache(key, data, ttl, fn) {
  
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

Cacheman.prototype.get = function _get(key, fn) {
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

Cacheman.prototype.set = function _set(key, data, ttl, fn) {

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

  if ('string' !== typeof key) {
    return process.nextTick(function tick() {
      fn(new CachemanError('Invalid key, key must be a string.'));
    });
  }

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

Cacheman.prototype.del = function _del(key, fn) {

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

Cacheman.prototype.clear = function _clear(fn) {
  fn = fn || noop;
  this._engine.clear(this.key(''), fn);
  return this;
};

/**
 * Wraps a function in cache. I.e., the first time the function is run,
 * its results are stored in cache so subsequent calls retrieve from cache
 * instead of calling the function.
 *
 * @param {String} key
 * @param {Function} work
 * @param {Number} ttl
 * @param {Function} fn
 * @api public
 */

Cacheman.prototype.wrap = function _wrap(key, work, ttl, fn) {

  var cache = this;

  if ('function' === typeof ttl) {
    fn = ttl;
    ttl = null;
  }

  fn = fn || noop;

  cache.get(key, function (err, res) {
    if (err || res) return fn(err, res);

    work(function _work(err, data) {
      if (err) return fn(err);

      cache.set(key, data, ttl, fn);
    });

  });

};

