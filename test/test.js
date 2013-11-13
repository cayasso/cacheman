var assert = require('assert')
  , Cacheman = require('../')
  , cache;

describe('cacheman', function () {

  before(function(done){
    cache = new Cacheman('testing');
    done();
  });

  after(function(done){
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

  it('should expire key', function (done) {
    this.timeout(0);
    cache.set('test7', { a: 1 }, 1, function (err) {
      if (err) return done(err);
      setTimeout(function () {
        cache.get('test7', function (err, data) {
        if (err) return done(err);
          assert.equal(data, null);
          done();
        });
      }, 1100);
    });
  });

  it('should accept `redis` as valid engine', function () {
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

  it('should accept `mongo` as valid engine', function () {
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

  it('should allow custom engine', function () {
    function engine(bucket, options) {
      return {
        set: function () {},
        get: function () {},
        del: function () {},
        clear: function () {}
      };
    }

    cache = new Cacheman('testing', { engine: engine });
    cache.set('test1', { a: 1 }, function (err) {
      if (err) return done(err);
      cache.get('test1', done);
    });
  });

});
