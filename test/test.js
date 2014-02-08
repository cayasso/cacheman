var assert = require('assert')
  , Cacheman = require('../')
  , cache;

describe('cacheman', function () {

  beforeEach(function(done){
    cache = new Cacheman('testing');
    done();
  });

  afterEach(function(done){
    cache.clear();
    done();
  });

  it('should have main methods', function () {
    assert.ok(cache.set);
    assert.ok(cache.get);
    assert.ok(cache.del);
    assert.ok(cache.clear);
    assert.ok(cache.cache);
  });

  it('should throw error on invalid name', function () {
    assert.throws(function() {
        new Cacheman(null);
      },
      Error
    );
  });
    
  it('should store items', function (done) {
    cache.set('test1', { a: 1 }, function (err) {
      if (err) return done(err);
      cache.get('test1', function (err, data) {
        if (err) return done(err);
        assert.equal(data.a, 1);
        done();
      });
    });
  });

  it('should store zero', function (done) {
    cache.set('test2', 0, function (err) {
      if (err) return done(err);
      cache.get('test2', function (err, data) {
        if (err) return done(err);
        assert.strictEqual(data, 0);
        done();
      });
    });
  });

  it('should store false', function (done) {
    cache.set('test3', false, function (err) {
      if (err) return done(err);
      cache.get('test3', function (err, data) {
        if (err) return done(err);
        assert.strictEqual(data, false);
        done();
      });
    });
  });

  it('should store null', function (done) {
    cache.set('test4', null, function (err) {
      if (err) return done(err);
      cache.get('test4', function (err, data) {
        if (err) return done(err);
        assert.strictEqual(data, null);
        done();
      });
    });
  });

  it('should delete items', function (done) {
    var value = Date.now();
    cache.set('test5', value, function (err) {
      if (err) return done(err);
      cache.get('test5', function (err, data) {
        if (err) return done(err);
        assert.equal(data, value);
        cache.del('test5', function (err) {
          if (err) return done(err);
          cache.get('test5', function (err, data) {
            if (err) return done(err);
            assert.equal(data, null);
            done();
          });
        });
      });
    });
  });

  it('should clear items', function (done) {
    var value = Date.now();
    cache.set('test6', value, function (err) {
      if (err) return done(err);
      cache.get('test6', function (err, data) {
        if (err) return done(err);
        assert.equal(data, value);
        cache.clear(function (err) {
          if (err) return done(err);
          cache.get('test6', function (err, data) {
            if (err) return done(err);
            assert.equal(data, null);
            done();
          });
        });
      });
    });
  });
  
  it('should cache items', function (done) {
    var value = Date.now()
    , key = "k" + Date.now();
    cache.cache(key, value, 10, function (err, data) {
      assert.equal(data, value);
      done();
    });
  });

  it('should allow middleware when using `cache` method', function (done) {

    this.timeout(0);
    var value = Date.now()
    , key = "k" + Date.now();

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
    var value = Date.now()
    , key = "k" + Date.now();

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

    var value = Date.now()
      , key = "k" + Date.now()
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
    var key = "k" + Date.now();
    cache.cache(key, 0, function (err, data) {
      assert.strictEqual(data, 0);
      done();
    });
  });

  it('should cache false', function (done) {
    var key = "k" + Date.now();
    cache.cache(key, false, function (err, data) {
      assert.strictEqual(data, false);
      done();
    });
  });

  it('should cache null', function (done) {
    var key = "k" + Date.now();
    cache.cache(key, null, 10, function (err, data) {
      assert.strictEqual(data, null);
      done();
    });
  });
  
  it('should accept `redis` as valid engine', function (done) {
    cache = new Cacheman('testing', { engine: 'redis' });
    cache.set('test1', { a: 1 }, function (err) {
      if (err) return done(err);
      cache.get('test1', function (err, data) {
        if (err) return done(err);
        assert.equal(data.a, 1);
        done();
      });
    });
  });

  it('should accept `mongo` as valid engine', function (done) {
    cache = new Cacheman('testing', { engine: 'mongo' });
    cache.set('test1', { a: 1 }, function (err) {
      if (err) return done(err);
      cache.get('test1', function (err, data) {
        if (err) return done(err);
        assert.equal(data.a, 1);
        done();
      });
    });
  });

  
  // Testing Cacheman-file
  it('should accept `file` as a valid engine', function (done) {
    cache = new Cacheman('testing', {engine: 'file' });
    cache.set('test1', { a:1 }, function (err) {
      if (err) return done(err);
      cache.get('test1', function (err, data) {
        if (err) return done(err);
        assert.equal(data.a, 1);
        done();
      });
    });
  });

  it('should allow custom engine', function (done) {
    function engine(bucket, options) {
      var store = {};
      return {
        set: function (key, data, ttl, fn) { store[key] = data; fn(null, data); },
        get: function (key, fn) { fn(null, store[key]); },
        del: function (key) { delete store[key]; },
        clear: function () { store = {}; }
      };
    }

    var c = new Cacheman('test', { engine: engine });
    c.set('test1', { a: 1 }, function (err) {
      if (err) return done(err);
      c.get('test1', function () {
        done();
      });
    });
  });

  it('should throw error on engine missing engine', function () {
    assert.throws(function() {
        new Cacheman(null, { engine: 'missing' });
      },
      Error
    );
  });

  it('should allow passing ttl in human readable format minutes', function (done) {
    var key = "k" + Date.now();
    cache.set(key, 'human way', '1m', function (err, data) {
      cache.get(key, function (err, data) {
        assert.strictEqual(data, 'human way');
        done();
      });
    });
  });

  it('should allow passing ttl in human readable format seconds', function (done) {
    var key = "k" + Date.now();
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
    var key = "k" + Date.now();
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

});
