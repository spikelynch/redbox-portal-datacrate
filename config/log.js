/**
 * Built-in Log Configuration
 * (sails.config.log)
 *
 * Configure the log level for your app, as well as the transport
 * (Underneath the covers, Sails uses Winston for logging, which
 * allows for some pretty neat custom transports/adapters for log messages)
 *
 * For more information on the Sails logger, check out:
 * http://sailsjs.org/#!/documentation/concepts/Logging
 */

const winston = require('winston')

const customLogger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      level: 'verbose',
      json: false
    }),
    new (winston.transports.File)({
      name: 'info-file',
      filename: 'logs/info.log',
      colorize: false,
      level: 'info', 
      json: false
    }),
    new (winston.transports.File)({
      name: 'errors-file',
      filename: 'logs/error.log',
      colorize: false,
      level: 'error',
      json: false
    })
  ]
})

module.exports.log = {
  custom: customLogger

}
