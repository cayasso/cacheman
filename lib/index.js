'use strict';

/**
 * Module dependencies.
 */

import ms from 'ms';

/**
 * Module constants.
 */

const noop = () => {};
const engines = ['memory', 'redis', 'mongo', 'file'];

/**
 * Cacheman base error class.
 *
 * @constructor
 * @param {String} message
 * @api private
 */

class CachemanError extends Error {
  constructor(message) {
    super(message);
    const { name } = this.constructor;
    this.name = name;
    this.message = message;
    Error.captureStackTrace(this, name);
  }
}

/**
 * Cacheman constructor.
 *
 * @param {String} name
 * @param {Object} options
 * @api public
 */

export default class Cacheman {

  /**
   * Class constructor method.
   *
   * @param {String} name
   * @param {Object} [options]
   * @return {Cacheman} this
   * @api public
   */

  constructor(name, options = {}) {
    if (name && 'object' === typeof name) {
      options = name;
      name = null;
    }
    
    let { 
      prefix = 'cacheman', 
      engine = 'memory', 
      delimiter = ':', 
      ttl = 60 
    } = options;

    ttl = Math.round(ms(ttl)/1000);

    prefix = [prefix, name || 'cache', ''].join(delimiter);
    this.options = { ...options, delimiter, prefix, ttl, count: 1000 };
    this._prefix = prefix;
    this._ttl = ttl;
    this._fns = [];
    this.engine(engine);
  }

  /**
   * Set get engine.
   *
   * @param {String} engine
   * @param {Object} options
   * @return {Cacheman} this
   * @api public
   */

  engine(engine, options) {
    
    if (!arguments.length) return this._engine;

    const type = typeof engine;

    if (! /string|function|object/.test(type)) {
      throw new CachemanError('Invalid engine format, engine must be a String, Function or a valid engine instance');
    }

    if ('string' === type) {

      let Engine;

      if (~Cacheman.engines.indexOf(engine)) {
        engine = `cacheman-${engine}`;
      }

      try {
        Engine = require(engine);
      } catch(e) {
        if (e.code === 'MODULE_NOT_FOUND') {
          throw new CachemanError(`Missing required npm module ${engine}`);
        } else {
          throw e;
        }
      }

      this._engine = new Engine(options || this.options, this);

    } else if ('object' === type) {
      ['get', 'set', 'del', 'clear'].forEach(key => {
        if ('function' !== typeof engine[key]) {
          throw new CachemanError('Invalid engine format, must be a valid engine instance');
        }
      })

      this._engine = engine;

    } else {
      this._engine = engine(options || this.options, this);
    }

    return this;
  }

  /**
   * Wrap key with prefix.
   *
   * @param {String} key
   * @return {String}
   * @api private
   */

  key(key) {
    return this._prefix + key;
  }

  /**
   * Sets up namespace middleware.
   *
   * @return {Cacheman} this
   * @api public
   */

  use(fn) {
    this._fns.push(fn);
    return this;
  }

  /**
   * Executes the cache middleware.
   *
   * @param {String} key
   * @param {Mixed} data
   * @param {Number} ttl
   * @param {Function} fn
   * @api private
   */

  run(key, data, ttl, fn) {
    const fns = this._fns.slice(0);
    if (!fns.length) return fn(null);

    const go = i => {
      fns[i](key, data, ttl, (err, _data, _ttl, _force) => {
        // upon error, short-circuit
        if (err) return fn(err);

        // if no middleware left, summon callback
        if (!fns[i + 1]) return fn(null, _data, _ttl, _force);

        // go on to next
        go(i + 1);
      });
    }

    go(0);
  }

  /**
   * Set an entry.
   *
   * @param {String} key
   * @param {Mixed} data
   * @param {Number} ttl
   * @param {Function} fn
   * @return {Cacheman} this
   * @api public
   */

  cache(key, data, ttl, fn = noop) {

    if ('function' === typeof ttl) {
      fn = ttl;
      ttl = null;
    }

    this.get(key, (err, res) => {

      this.run(key, res, ttl, (_err, _data, _ttl, _force) => {

        if (err || _err) return fn(err || _err);

        let force = false;
        
        if ('undefined' !== typeof _data) {
          force = true;
          data = _data;
        }

        if ('undefined' !== typeof _ttl) {
          force = true;
          ttl = _ttl;
        }

        if ('undefined' === typeof res || force) {
          return this.set(key, data, ttl, fn);
        }

        fn(null, res);

      });

    });

    return this;
  }

  /**
   * Get an entry.
   *
   * @param {String} key
   * @param {Function} fn
   * @return {Cacheman} this
   * @api public
   */

  get(key, fn = noop) {
    this._engine.get(this.key(key), fn);
    return this;
  }

  /**
   * Set an entry.
   *
   * @param {String} key
   * @param {Mixed} data
   * @param {Number} ttl
   * @param {Function} fn
   * @return {Cacheman} this
   * @api public
   */

  set(key, data, ttl, fn = noop) {

    if ('function' === typeof ttl) {
      fn = ttl;
      ttl = null;
    }

    if (ttl) {
      if ('string' === typeof ttl) {
        ttl = Math.round(ms(ttl)/1000);
      }
    }

    if ('string' !== typeof key) {
      return process.nextTick(() => {
        fn(new CachemanError('Invalid key, key must be a string.'));
      });
    }

    if ('undefined' === typeof data) {
      return process.nextTick(fn);
    }

    this._engine.set(this.key(key), data, ttl || this._ttl, fn);

    return this;
  }

  /**
   * Delete an entry.
   *
   * @param {String} key
   * @param {Function} fn
   * @return {Cacheman} this
   * @api public
   */

  del(key, fn = noop) {

    if ('function' === typeof key) {
      fn = key;
      key = '';
    }

    this._engine.del(this.key(key), fn);
    return this;
  }

  /**
   * Clear all entries.
   *
   * @param {String} key
   * @param {Function} fn
   * @return {Cacheman} this
   * @api public
   */

  clear(fn = noop) {
    this._engine.clear(fn);
    return this;
  }

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

  wrap(key, work, ttl, fn = noop) {

    if ('function' === typeof ttl) {
      fn = ttl;
      ttl = null;
    }

    this.get(key, (err, res) => {
      if (err || res) return fn(err, res);

      work((err, data) => {
        if (err) return fn(err);
        this.set(key, data, ttl, err => {
          fn(err, data);
        });
      });

    });

    return this;
  }
}

Cacheman.engines = engines;
