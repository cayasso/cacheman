function Hilmi(options) {
  if (!(this instanceof Hilmi))
    return new Hilmi(options);

  this.options = options || {};

  if (!this.options.store)
    this.options.store = new Hilmi.MemoryStore(1000);
}

Hilmi.prototype.option = function(key, value) {
  if (typeof value === 'undefined')
    return this.options[key];

  return this.options[key] = value;
};

Hilmi.prototype._makeKey = function(key) {
  return "cache:" + (this.options.prefix ? this.options.prefix + ':' : '') + key;
}

Hilmi.prototype.cache = function(key, miss, next, mttl) {
  var self = this;

  if (self.options.disabled)
    return miss(next);

  self.get(key, function(err, data) {
    if (err) return next(err);
    if (typeof data !== 'undefined') return next(null, data);

    miss(function(err, data, ttl) {
      if (err) return next(err);
      if (!data) return next(null, data);

      self.set(key, data, ttl || mttl || self.options.ttl || 60, next);
    });
  });
};

Hilmi.prototype.get = function(key, next) {
  this.options.store.get(this._makeKey(key), next);
};

Hilmi.prototype.set = function(key, value, ttl, next) {
  if (typeof ttl === 'function') {
    next = ttl;
    ttl = null;
  }

  if (typeof value === 'undefined')
    return process.nextTick(next);

  this.options.store.set(this._makeKey(key), value, ttl, next);
};

Hilmi.prototype.del = function(key, next) {
  this.options.store.del(this._makeKey(key), next);
};

Hilmi.prototype.clear = function(next) {
  this.options.store.clear(this._makeKey(""), next);
};

Hilmi.MemoryStore = require("./storage/memory.js");
Hilmi.RedisStore = require("./storage/redis.js");

module.exports = Hilmi;
