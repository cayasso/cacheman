var lru = require("lru-cache");

function MemoryStore(count) {
  this.cache = lru(count || 100);
}

MemoryStore.prototype.get = function (key, next) {
  var data = this.cache.get(key);
  if (!data) return next(null, data);

  if (data.expire < Date.now()) {
    this.cache.del(key);
    return next();
  }

  return next(null, JSON.parse(data.value));
};

MemoryStore.prototype.set = function(key, value, ttl, next) {
  if (typeof value == "undefined") return next();

  var data = {
    value: JSON.stringify(value),
    expire: Date.now() + ((ttl || 60) * 1000)
  };

  this.cache.set(key, data);

  if (typeof next === "function")
    next(null, value);
};

MemoryStore.prototype.del = function(key, next) {
  this.set(key, null, -1, next);
};

MemoryStore.prototype.clear = function(prefix, next) {
  this.cache.reset();

  if (typeof next == 'function')
    process.nextTick(next);
}

module.exports = MemoryStore;
