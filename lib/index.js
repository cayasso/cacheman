'use strict';

/**
 * Module dependencies.
 */

import ms from 'ms';

/**
 * Module constants.
 */

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
    this.name = this.constructor.name;
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Helper to allow all async methods to support both callbacks and promises
 */

function maybePromised(_this, callback, wrapped) {
  if ('function' === typeof callback) {
    // Call wrapped with unmodified callback
    wrapped(callback);

    // Return `this` to keep the same behaviour Cacheman had before promises were added
    return _this;
  } else {
    let _Promise = _this.options.Promise;

    if ('function' !== typeof _Promise) {
      throw new CachemanError('Promises not available: Please polyfill native Promise before creating a Cacheman object, pass a Promise library as a Cacheman option, or use the callback interface')
    }

    if (_Promise.fromCallback) {
      // Bluebird's fromCallback, this is faster than new Promise
      return _Promise.fromCallback(wrapped)
    }

    // Standard new Promise based wrapper for native Promises
    return new _Promise(function(resolve, reject) {
      wrapped(function(err, value) {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
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

    const _Promise = options.Promise || (function() {
      try {
        return Promise;
      } catch (e) {}
    })();

    let {
      prefix = 'cacheman',
      engine = 'memory',
      delimiter = ':',
      ttl = 60
    } = options;

    if ('string' === typeof ttl) {
      ttl = Math.round(ms(ttl)/1000);
    }

    prefix = [prefix, name || 'cache', ''].join(delimiter);
    this.options = { count: 1000, ...options, Promise: _Promise, delimiter, prefix, ttl };
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
    if ( Array.isArray(key) ) {
      key = key.join(this.options.delimiter);
    }
    return (this.options.engine === 'redis') ? key : this._prefix + key;
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
   * @param {Function} [fn]
   * @return {Cacheman} this
   * @api public
   */

  cache(key, data, ttl, fn) {

    if ('function' === typeof ttl) {
      fn = ttl;
      ttl = null;
    }

    return maybePromised(this, fn, (fn) => {

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

    });
  }

  /**
   * Get an entry.
   *
   * @param {String} key
   * @param {Function} [fn]
   * @return {Cacheman} this
   * @api public
   */

  get(key, fn) {
    return maybePromised(this, fn, (fn) =>
      this._engine.get(this.key(key), fn));
  }

  /**
   * Set an entry.
   *
   * @param {String} key
   * @param {Mixed} data
   * @param {Number} ttl
   * @param {Function} [fn]
   * @return {Cacheman} this
   * @api public
   */

  set(key, data, ttl, fn) {

    if ('function' === typeof ttl) {
      fn = ttl;
      ttl = null;
    }

    if ('string' === typeof ttl) {
      ttl = Math.round(ms(ttl)/1000);
    }

    return maybePromised(this, fn, (fn) => {
      if ('string' !== typeof key && !Array.isArray(key)) {
        return process.nextTick(() => {
          fn(new CachemanError('Invalid key, key must be a string or array.'));
        });
      }

      if ('undefined' === typeof data) {
        return process.nextTick(fn);
      }

      return this._engine.set(this.key(key), data, ttl || this._ttl, fn);
    });
  }

  /**
   * Delete an entry.
   *
   * @param {String} key
   * @param {Function} [fn]
   * @return {Cacheman} this
   * @api public
   */

  del(key, fn) {

    if ('function' === typeof key) {
      fn = key;
      key = '';
    }

    return maybePromised(this, fn, (fn) =>
      this._engine.del(this.key(key), fn));
  }

  /**
   * Clear all entries.
   *
   * @param {String} key
   * @param {Function} [fn]
   * @return {Cacheman} this
   * @api public
   */

  clear(fn) {
    return maybePromised(this, fn, (fn) =>
      this._engine.clear(fn));
  }

  /**
   * Wraps a function in cache. I.e., the first time the function is run,
   * its results are stored in cache so subsequent calls retrieve from cache
   * instead of calling the function.
   *
   * @param {String} key
   * @param {Function} work
   * @param {Number} ttl
   * @param {Function} [fn]
   * @api public
   */

  wrap(key, work, ttl, fn) {

    // Allow work and ttl to be passed in the oposite order to make promises nicer
    if ('function' !== typeof work && 'function' === typeof ttl) {
      [ttl, work] = [work, ttl];
    }

    if ('function' === typeof ttl) {
      fn = ttl;
      ttl = null;
    }

    return maybePromised(this, fn, (fn) => {

      this.get(key, (err, res) => {
        if (err || res) return fn(err, res);

        let next = (err, data) => {
          if (err) return fn(err);
          this.set(key, data, ttl, err => {
            fn(err, data);
          });

          // Don't allow callbacks to be called twice
          next = () => {
            process.nextTick(() => {
              throw new CachemanError('callback called twice');
            });
          };
        }

        if ( work.length >= 1 ) {
          const result = work((err, data) => next(err, data));
          if ('undefined' !== typeof result) {
            process.nextTick(() => {
              throw new CachemanError('return value cannot be used when callback argument is used');
            });
          }
        } else {
          try {
            const result = work();
            if ('object' === typeof result && 'function' === typeof result.then) {
              result
                .then((value) => next(null, value))
                .then(null, (err) => next(err));
            } else {
              next(null, result);
            }
          } catch (err) {
            next(err);
          }
        }
      });

    });
  }
}

Cacheman.engines = engines;
