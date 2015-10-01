'use strict';

/**
 * Cacheman base error class.
 *
 * @constructor
 * @param {String} message
 * @param {EventEmitter} logger
 * @api public
 */

export default class CachemanError extends Error {
  constructor(message, logger) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    Error.captureStackTrace(this, this.constructor.name);
    if (logger) logger.emit('error', this);
  }
}