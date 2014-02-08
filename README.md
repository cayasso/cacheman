# cacheman

[![Build Status](https://travis-ci.org/cayasso/cacheman.png?branch=master)](https://travis-ci.org/cayasso/cacheman)
[![NPM version](https://badge.fury.io/js/cacheman.png)](http://badge.fury.io/js/cacheman)

Small and efficient cache provider for Node.JS with In-memory, File, Redis and MongoDB engines.

## Instalation

``` bash
$ npm install cacheman
```

## Usage

```javascript
var Cacheman = require('cacheman');
var cache = new Cacheman('todo');

// set the value
cache.set('my key', { foo: 'bar' }, function (error) {

  if (error) throw error;

  // get the value
  cache.get('my key', function (error, value) {

    if (error) throw error;

    console.log(value); //-> {foo:"bar"}

    // delete entry
    cache.del('my key', function (error){
      
      if (error) throw error;

      console.log('value deleted');
    });

  });
});
```

## API

### Cacheman(name, [options])

Create `cacheman` instance. It accepts a required `name` and an `options`. `options` can contain `ttl` to set the default "Time To Live" in seconds, `engine` that could be "memory", "in file", "redis" or "mongo", and the corresponding engine options that can be passed like `port`, `host`, etc.

By default `cacheman` uses the `cacheman-memory` engine.

```javascript
var options = {
  ttl: 90,
  engine: 'redis',
  port: 9999,
  host: '127.0.0.1'
};

var cache = new Cacheman('todo', options);
```

### cache.set(key, value, [ttl, [fn]])

Stores or updates a value.

```javascript
cache.set('foo', { a: 'bar' }, function (err, value) {
  if (err) throw err;
  console.log(value); //-> {a:'bar'}
});
```

Or add a TTL(Time To Live) in seconds like this:

```javascript
// key will expire in 60 seconds
cache.set('foo', { a: 'bar' }, 60, function (err, value) {
  if (err) throw err;
  console.log(value); //-> {a:'bar'}
});
```

You can also use humman readable values for `ttl` like: `1s`, `1m`, etc. Check out the [ms](https://github.com/guille/ms.js) project for additional information on supported formats.

```javascript
// key will expire in 45 seconds
cache.set('foo', { a: 'bar' }, '45s', function (err, value) {
  if (err) throw err;
  console.log(value); //-> {a:'bar'}
});
```

### cache.get(key, fn)

Retrieves a value for a given key, if there is no value for the given key a null value will be returned.

```javascript
cache.get(function (err, value) {
  if (err) throw err;
  console.log(value);
});
```

### cache.del(key, [fn])

Deletes a key out of the cache.

```javascript
cache.del('foo', function (err) {
  if (err) throw err;
  // foo was deleted
});
```

### cache.clear([fn])

Clear the cache entirely, throwing away all values.

```javascript
cache.clear(function (err) {
  if (err) throw err;
  // cache is now clear
});
```

### cache.cache(key, data, ttl, [fn])

Cache shortcut method that support middleware. This method will first call `get`
and if the key is not found in cache it will call `set` to save the value in cache.

```javascript
cache.cache('foo', { a: 'bar' }, '45s', function (err) {
  if (err) throw err;
  console.log(value); //-> {a:'bar'}
});
```

### cache.use(fn)

This method allow to add middlewares that will be executed when the `cache` method 
is called, meaning that you can intercept the function right after the `get` and `get` methods.

For example we can add a middleware that will force ttl of 10 seconds on all values to cache:

```javascript
function expireInMiddleware (expireIn) {
  return function (key, data, ttl, next) {
    next(null, data, expire);
  }
};

cache.use(expireInMiddleware('10s'));

cache.cache('foo', { a: 'bar' }, '45s', function (err) {
  if (err) throw err;
  console.log(value); //-> {a:'bar'}
});
```

Or we can add a middleware to ovewrite the value:

```javascript
function overwriteMiddleware (val) {
  return function (key, data, ttl, next) {
    next(null, val, expire);
  }
};

cache.use(overwriteMiddleware({ a: 'foo' }));

cache.cache('foo', { a: 'bar' }, '45s', function (err, data) {
  if (err) throw err;
  console.log(data); //-> {a:'foo'}
});
```

You can also pass errors as first argument to stop the cache execution:

```javascript
function overwriteMiddleware () {
  return function (key, data, ttl, next) {
    next(new Error('There was an error'));
  }
};

cache.use(overwriteMiddleware());

cache.cache('foo', { a: 'bar' }, '45s', function (err) {
  if (err) throw err; // Will throw the error
});
```

## Run tests

``` bash
$ make test
```

## Supported engines

 * [cacheman-memory](https://github.com/cayasso/cacheman-memory)
 * [cacheman-redis](https://github.com/cayasso/cacheman-redis)
 * [cacheman-mongo](https://github.com/cayasso/cacheman-mongo)
 * [cacheman-file](https://github.com/taronfoxworth/cacheman-file)

## Credits

This library was inspired by the [hilmi](https://github.com/eknkc/hilmi) project.

## License

(The MIT License)

Copyright (c) 2013 Jonathan Brumley &lt;cayasso@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
