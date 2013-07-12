var redis = require('redis');

function RedisStore(options) {
  options = options || {};

  this.client = options.client || new redis.createClient(options.port || options.socket, options.host, options);

  if (options.pass) {
    this.client.auth(options.pass, function(err){
      if (err) throw err;
    });
  }
}

RedisStore.prototype.get = function (key, next) {
  this.client.get(key, function(err, data){
    try {
      if (!data) return next();
      data = data.toString();
      next(null, JSON.parse(data));
    } catch (err) {
      next(err);
    }
  });
}

RedisStore.prototype.set = function(key, value, ttl, next) {
  try {
    this.client.setex(key, (ttl || 60), JSON.stringify(value), function(err) {
      if (err) return next(err);
      next(null, value);
    });
  } catch (err) {
    next(err);
  }
}

RedisStore.prototype.del = function(key, next) {
  this.client.del(key, next);
}

RedisStore.prototype.clear = function(key, next) {
  var self = this;

  self.client.keys(key + '*', function (err, data) {
    if (err) return next(err);
    var count = data.length;

    data.forEach(function (key) {
      self.del(key, function (err, data) {
        if (err) {
          count = 0;
          return next(err);
        }

        if (--count == 0) {
          next();
        }
      });
    });
  });
}

module.exports = RedisStore;
