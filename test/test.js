var assert = require("assert")
  , hilmi = require("../")

function testStore(s, next) {
  s.set('test1', { a: 1 }, function (err) {
    if (err) return next(err);

    s.get('test1', function (err, data) {
      if (err) return next(err);
      assert.equal(data.a, 1);
      next();
    });
  });
}

function testDelete(s, next) {
  var value = Date.now()

  s.set('test', value, function (err) {
    if (err) return next(err);

    s.get('test', function (err, data) {
      if (err) return next(err);
      assert.equal(data, value);

      s.del('test', function (err) {
        if (err) return next(err);

        s.get('test', function (err, data) {
          if (err) return next(err);
          assert.equal(data, null);
          next();
        });
      })
    });
  });
}

function testClear(s, next) {
  var value = Date.now()

  s.set('test', value, function (err) {
    if (err) return next(err);

    s.get('test', function (err, data) {
      if (err) return next(err);
      assert.equal(data, value);

      s.clear(function (err) {
        if (err) return next(err);

        s.get('test', function (err, data) {
          if (err) return next(err);
          assert.equal(data, null);
          next();
        });
      })
    });
  });
}

function testCache(s, next) {
  var value = Date.now()
    , key = "k" + Date.now()

  s.cache(key, function (next) {
    next(null, value, 10);
  }, function (err, data) {
    assert.equal(data, value);
    next();
  });
}

function testCacheZero(s, next) {
  var key = "k" + Date.now()

  s.cache(key, function (next) {
    next(null, 0);
  }, function (err, data) {
    assert.strictEqual(data, 0);
    next();
  });
}

function testCacheFalse(s, next) {
  var key = "k" + Date.now()

  s.cache(key, function (next) {
    next(null, false);
  }, function (err, data) {
    assert.strictEqual(data, false);
    next();
  });
}

function testCacheNull(s, next) {
  var key = "k" + Date.now()

  s.cache(key, function (next) {
    next(null, null);
  }, function (err, data) {
    assert.strictEqual(data, null);
    next();
  });
}

describe('hilmi', function () {
  describe("memory store", function () {
    it('should store items', function (next) {
      testStore(hilmi(), next)
    });

    it('should delete items', function (next) {
      testDelete(hilmi(), next)
    });

    it('should clear items', function (next) {
      testClear(hilmi(), next)
    });

    it('should cache items', function (next) {
      testCache(hilmi(), next)
    });

    it('should cache zero', function (next) {
      testCacheZero(hilmi(), next)
    });

    it('should cache false', function (next) {
      testCacheFalse(hilmi(), next)
    });

    it('should cache null', function (next) {
      testCacheZero(hilmi(), next)
    });
  });

  describe("redis store", function () {
    it('should store items', function (next) {
      testStore(hilmi({ store: new hilmi.RedisStore(), prefix: "" + Date.now() }), next)
    });

    it('should delete items', function (next) {
      testDelete(hilmi({ store: new hilmi.RedisStore(), prefix: "" + Date.now() }), next)
    });

    it('should clear items', function (next) {
      testClear(hilmi({ store: new hilmi.RedisStore(), prefix: "" + Date.now() }), next)
    });

    it('should cache items', function (next) {
      testCache(hilmi({ store: new hilmi.RedisStore(), prefix: "" + Date.now() }), next)
    });
  });
});
