# Hilmi - tiny cache helper for Node.JS

	npm install hilmi
	
# Usage
	var hilmi = require("hilmi");
	
	// Create a new bucket
	var b = hilmi();
	
	// Set an entry
	b.set(key, value, ttlInSeconds function(err)…);
	// Get an entry
	b.get(key, function(err,data)…);
	// Delete an entry
	b.delete(key, function(err,data)…);
	// Clear a bucket
	b.clear(function(err,data)…)
	
	// You can use different storage engines
	
	// Create a bucket and use a LRU memory storw ith capacity 10
	var b = hilmi({ store: new hilmi.MemoryStore(10) });
	// Create a bucket and use a Redis store and prefix entries with 'cache'
	var b = hilmi({ store: new hilmi.RedisStore(10), prefix: "cache" });	

	// Cache shortcut method
	b.cache(key, function miss(next) {
		// In case the entry is not in sotage, generate it and call next with the data
		// This function will not be called if the entry is already cached
		// TTL is optional, you can provide it in parent function call too.
		next(err, data, ttl);
	}, function(err, data) {
		// data has been fetched from cache or freshly generated.
	}, ttl);
# License
MIT