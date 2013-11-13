'use strict';

/**
 * Module exports.
 */

module.exports = CachemanError;

/**
 * Generic Bucket error.
 *
 * @constructor
 * @param {String} message The reason for the error
 * @param {EventEmitter} logger Optional EventEmitter to emit a `log` event on.
 * @api public
 */

function CachemanError(message, logger) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);

  this.message = message;
  this.name = this.constructor.name;

  if (logger) {
    logger.emit('log', 'error', message, this);
  }
}

/**
 * Inherits from `Strategy`.
 */

CachemanError.prototype.__proto__ = Error.prototype;