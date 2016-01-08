'use strict';

/**
 * Module dependencies.
 */

import assert from 'assert';
import Bluebird from 'bluebird';
import Cacheman from '../lib/index';

Bluebird.noConflict();

let cache;
let n = 0;

function testKey() {
  return 'test' + (++n);
}

describe('cacheman', function () {

  beforeEach(function(done){
    cache = new Cacheman('testing');
    done();
  });

  afterEach(function(done){
    cache.clear(done);
  });

  it('should return a proper CommonJS module, not an ES6-only one', function() {
    var mod = require('../node/index');
    assert.equal(typeof(mod), 'function');
  });

  it('should have main methods', function () {
    assert.ok(cache.set);
    assert.ok(cache.get);
    assert.ok(cache.del);
    assert.ok(cache.clear);
    assert.ok(cache.cache);
  });

  it('should set correct prefix', function () {
    let c1 = new Cacheman();
    let c2 = new Cacheman('foo');
    let c3 = new Cacheman('foo', { prefix: 'myprefix' });
    assert.equal(c1._prefix, 'cacheman:cache:');
    assert.equal(c2._prefix, 'cacheman:foo:');
    assert.equal(c3._prefix, 'myprefix:foo:');
  });

  it('should not allow invalid keys', function (done) {
    let msg = 'Invalid key, key must be a string or array.';
    cache.set(1, {}, function (err) {
      assert.equal(err.message, msg);
      cache.set(null, {}, function (err) {
        assert.equal(err.message, msg);
        cache.set(undefined, {}, function (err) {
        assert.equal(err.message, msg);
          done();
        });
      });
    });
  });
    
  it('should store items', function (done) {
    let key = testKey();
    cache.set(key, { a: 1 }, function (err) {
      if (err) return done(err);
      cache.get(key, function (err, data) {
        if (err) return done(err);
        assert.equal(data.a, 1);
        done();
      });
    });
  });

  it('should store zero', function (done) {
    let key = testKey();
    cache.set(key, 0, function (err) {
      if (err) return done(err);
      cache.get(key, function (err, data) {
        if (err) return done(err);
        assert.strictEqual(data, 0);
        done();
      });
    });
  });

  it('should store false', function (done) {
    let key = testKey();
    cache.set(key, false, function (err) {
      if (err) return done(err);
      cache.get(key, function (err, data) {
        if (err) return done(err);
        assert.strictEqual(data, false);
        done();
      });
    });
  });

  it('should store null', function (done) {
    let key = testKey();
    cache.set(key, null, function (err) {
      if (err) return done(err);
      cache.get(key, function (err, data) {
        if (err) return done(err);
        assert.strictEqual(data, null);
        done();
      });
    });
  });

  it('should delete items', function (done) {
    let key = testKey()
      , value = Date.now();
    cache.set(key, value, function (err) {
      if (err) return done(err);
      cache.get(key, function (err, data) {
        if (err) return done(err);
        assert.equal(data, value);
        cache.del(key, function (err) {
          if (err) return done(err);
          cache.get(key, function (err, data) {
            if (err) return done(err);
            assert.equal(data, null);
            done();
          });
        });
      });
    });
  });

  it('should clear items', function (done) {
    let key = testKey()
      , value = Date.now();
    cache.set(key, value, function (err) {
      if (err) return done(err);
      cache.get(key, function (err, data) {
        if (err) return done(err);
        assert.equal(data, value);
        cache.clear(function (err) {
          if (err) return done(err);
          cache.get(key, function (err, data) {
            if (err) return done(err);
            assert.equal(data, null);
            done();
          });
        });
      });
    });
  });
  
  it('should cache items', function (done) {
    let key = testKey()
      , value = Date.now();
    cache.cache(key, value, 10, function (err, data) {
      assert.equal(data, value);
      done();
    });
  });

  it('should allow middleware when using `cache` method', function (done) {

    this.timeout(0);
    let key = testKey()
      , value = Date.now();

    function middleware() {
      return function(key, data, ttl, next){
        next();
      };
    }

    cache.use(middleware());
    cache.cache(key, value, 1, function (err, data) {
      assert.strictEqual(data, value);
      done();
    });
  });

  it('should allow middleware to overwrite caching values', function (done) {
    let key = testKey()
      , value = Date.now();

    function middleware() {
      return function(key, data, ttl, next){
        next(null, 'data', 1);
      };
    }

    cache.use(middleware());
    cache.cache(key, value, 1, function (err, data) {
      assert.strictEqual(data, 'data');
      done();
    });
  });

  it('should allow middleware to accept errors', function (done) {

    let key = testKey()
      , value = Date.now()
      , error = new Error('not');

    function middleware() {
      return function(key, data, ttl, next){
        next(error);
      };
    }

    cache.use(middleware());

    cache.cache(key, value, 1, function (err, data) {
      if (1 === arguments.length && err) {
        assert.strictEqual(err, error);
        done();
      }
    });
  });

  it('should cache zero', function (done) {
    let key = testKey();
    cache.cache(key, 0, function (err, data) {
      assert.strictEqual(data, 0);
      done();
    });
  });

  it('should cache false', function (done) {
    let key = testKey();
    cache.cache(key, false, function (err, data) {
      assert.strictEqual(data, false);
      done();
    });
  });

  it('should cache null', function (done) {
    let key = testKey();
    cache.cache(key, null, 10, function (err, data) {
      assert.strictEqual(data, null);
      done();
    });
  });

  it('should allow array keys', function (done) {
    cache.set(['a', 'b'], 'array keyed', function (err) {
      if (err) return done(err);
      cache.get('a:b', function (err, data) {
        if (err) return done(err);
        assert.equal(data, 'array keyed');
        done();
      });
    });
  });

  it('should allow the delimiter to be customized', function (done) {
    let c = new Cacheman({ delimiter: '-' });
    c.set(['a', 'b'], 'array keyed', function (err) {
      if (err) return done(err);
      c.get('a-b', function (err, data) {
        if (err) return done(err);
        assert.equal(data, 'array keyed');
        done();
      });
    });
  });

  it('should accept a valid engine', function (done) {
    function engine(bucket, options) {
      let store = {};
      return {
        set: function (key, data, ttl, fn) { store[key] = data; fn(null, data); },
        get: function (key, fn) { fn(null, store[key]); },
        del: function (key) { delete store[key]; },
        clear: function () { store = {}; }
      };
    }

    let c = new Cacheman('test', { engine: engine });
    c.set('test1', { a: 1 }, function (err) {
      if (err) return done(err);
      c.get('test1', function () {
        done();
      });
    });
  });

  it('should throw error on missing engine', function () {
    assert.throws(function() {
        new Cacheman(null, { engine: 'missing' });
      },
      Error
    );
  });

  it('should allow passing ttl in human readable format minutes', function (done) {
    let key = testKey();
    cache.set(key, 'human way', '1m', function (err, data) {
      cache.get(key, function (err, data) {
        assert.strictEqual(data, 'human way');
        done();
      });
    });
  });

  it('should allow passing ttl in human readable format seconds', function (done) {
    let key = testKey();
    cache.set(key, 'human way again', '1s', function (err, data) {
      setTimeout(function () {
        cache.get(key, function (err, data) {
          assert.equal(data, null);
          done();
        });
      }, 1100);
    });
  });

  it('should expire key', function (done) {
    this.timeout(0);
    let key = testKey();
    cache.set(key, { a: 1 }, 1, function (err) {
      if (err) return done(err);
      setTimeout(function () {
        cache.get(key, function (err, data) {
        if (err) return done(err);
          assert.equal(data, null);
          done();
        });
      }, 1100);
    });
  });

  it('should support a custom default ttl', function (done) {
    let c = new Cacheman('test', { ttl: 2000 });
    let key = testKey();
    c.set(key, 'default human way', function (err) {
      if (err) return done(err);
      setTimeout(function () {
        c.get(key, function (err, data) {
          assert.equal(data, 'default human way');
          done();
        });
      }, 1100);
    });
  });

  it('should support a custom default ttl in human readable seconds', function (done) {
    let c = new Cacheman('test', { ttl: '2s' });
    let key = testKey();
    c.set(key, 'default human way', function (err) {
      if (err) return done(err);
      setTimeout(function () {
        c.get(key, function (err, data) {
          assert.equal(data, 'default human way');
          done();
        });
      }, 1100);
    });
  });

  it('should wrap a function in cache', function (done) {
    this.timeout(0);
    let key = testKey();
    cache.wrap(key, function (callback) {
      callback(null, {a: 1})
    }, 1100, function (err, data) {
      if (err) return done(err);
      assert.equal(data.a, 1);
      done();
    });
  });

  it('should not change wrapped function result type', function(done) {
    let key = testKey();
    var cache = new Cacheman('testing');
    cache.wrap(key, function (callback) {
      callback(null, {a: 1})
    }, 1100, function (err, data) {
      if (err) return done(err);
      assert.equal(typeof(data), 'object');
      done();
    });
  });

// Make sure to test the .skip using 0.12 and 0.10
  (global.Promise ? it : it.skip.bind(it))('should support native Promises', function (done) {
    let key = testKey();
    cache.set(key, 'test value', function (err) {
      if (err) return done(err);
      let p = cache.get(key);
      assert.equal(typeof(p), 'object');
      assert.notEqual(typeof(p._engine), 'function');
      assert.equal(typeof(p.then), 'function');
      p
        .then(function(data) {
          assert.equal(data, 'test value');
          done();
        })
        .catch(function(err) {
          done(err);
        });
    });
  });

  it('should return a Bluebird promise', function (done) {
    let c = new Cacheman('testing', {Promise: Bluebird})
      , key = testKey();
    c.set(key, 'test value', function (err) {
      if (err) return done(err);
      let p = c.get(key);
      assert.equal(typeof(p), 'object');
      assert.notEqual(typeof(p._engine), 'function');
      assert.equal(typeof(p.then), 'function');
      p
        .then(function(data) {
          assert.equal(data, 'test value');
          done();
        })
        .catch(function(err) {
          done(err);
        });
    });
  });

  it('should return a Promise from set', function (done) {
    let c = new Cacheman('testing', {Promise: Bluebird})
      , key = testKey()
      , p = c.set(key, 'test value');
    assert.equal(typeof(p), 'object');
    assert.notEqual(typeof(p._engine), 'function');
    assert.equal(typeof(p.then), 'function');
    p
      .then(function(data) {
        assert.equal(data, 'test value');

        c.get(key, function (err, data) {
          if (err) return done(err);
          assert.equal(data, 'test value');
          done();
        });
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should return a Promise from cache', function (done) {
    let c = new Cacheman('testing', {Promise: Bluebird})
      , key = testKey()
      , p = c.cache(key, 'test value');
    assert.equal(typeof(p), 'object');
    assert.notEqual(typeof(p._engine), 'function');
    assert.equal(typeof(p.then), 'function');
    p
      .then(function(data) {
        assert.equal(data, 'test value');

        c.get(key, function (err, data) {
          if (err) return done(err);
          assert.equal(data, 'test value');
          done();
        });
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should return a Promise from del', function (done) {
    let c = new Cacheman('testing', {Promise: Bluebird})
      , key = testKey();
    c.set(key, 'test value', function (err) {
      if (err) return done(err);
      let p = c.del(key);
      assert.equal(typeof(p), 'object');
      assert.notEqual(typeof(p._engine), 'function');
      assert.equal(typeof(p.then), 'function');
      p
        .then(function() {
          c.get(key, function (err, data) {
            if (err) return done(err);
            assert.equal(data, null);
            done();
          });
        })
        .catch(function(err) {
          done(err);
        });
    });
  });

  it('should return a Promise from clear', function (done) {
    let c = new Cacheman('testing', {Promise: Bluebird})
      , key = testKey();
    c.set(key, 'test value', function (err) {
      if (err) return done(err);
      let p = c.clear();
      assert.equal(typeof(p), 'object');
      assert.notEqual(typeof(p._engine), 'function');
      assert.equal(typeof(p.then), 'function');
      p
        .then(function() {
          c.get(key, function (err, data) {
            if (err) return done(err);
            assert.equal(data, null);
            done();
          });
        })
        .catch(function(err) {
          done(err);
        });
    });
  });

  it('should return a Promise from wrap', function (done) {
    this.timeout(0);
    let c = new Cacheman('testing', {Promise: Bluebird})
      , key = testKey()
      , p = c.wrap(key, function (callback) {
        callback(null, 'test value')
      }, 1100);
    assert.equal(typeof(p), 'object');
    assert.notEqual(typeof(p._engine), 'function');
    assert.equal(typeof(p.then), 'function');
    p
      .then(function(data) {
        assert.equal(data, 'test value');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should accept a promise returned by a wrapped function', function (done) {
    this.timeout(5);
    let key = testKey();
    cache.wrap(key, function () {
      return Bluebird.resolve('test value')
    }, 1100, function (err, data) {
      if (err) return done(err);
      assert.equal(data, 'test value');
      cache.get(key, function (err, data) {
        if (err) return done(err);
        assert.equal(data, 'test value');
        done();
      });
    });
  });

  it('should accept values returned by a wrapped function', function (done) {
    this.timeout(5);
    let key = testKey();
    cache.wrap(key, function () {
      return 'test value'
    }, 1100, function (err, data) {
      if (err) return done(err);
      assert.equal(data, 'test value');
      cache.get(key, function (err, data) {
        if (err) return done(err);
        assert.equal(data, 'test value');
        done();
      });
    });
  });

  it('should accept ttl and wraped function in inverted order', function (done) {
    this.timeout(5);
    let key = testKey();
    cache.wrap(key, 1100, function (callback) {
      callback(null, 'test value')
    }, function (err, data) {
      if (err) return done(err);
      assert.equal(data, 'test value');
      cache.get(key, function (err, data) {
        if (err) return done(err);
        assert.equal(data, 'test value');
        done();
      });
    });
  });

});
