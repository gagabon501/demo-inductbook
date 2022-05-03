var winston = require("winston");
require("winston-daily-rotate-file");

// const { createLogger, format } = require("winston");
// const { combine, timestamp, prettyPrint, colorize, errors } = format;
var path = require("path");
var PROJECT_ROOT = path.join(__dirname, "..");
var appRoot = require("app-root-path");
const moment = require("moment");

// const timezoned = () => {
//   return new Date().toLocaleString("en-GB", {
//     timeZone: "Pacific/Auckland",
//   });
// };

const timezoned = () => {
  return moment().tz("Pacific/Auckland").format("DD-MMM-YYYY @ HH:mm:ss");
};

/**
 * Attempts to add file and line number info to the given log arguments.
 */
function formatLogArguments(args) {
  args = Array.prototype.slice.call(args);

  var stackInfo = getStackInfo(1); //1

  if (stackInfo) {
    // get file path relative to project root
    var calleeStr = "(" + stackInfo.relativePath + ":" + stackInfo.line + ")";

    if (typeof args[0] === "string") {
      args[0] = calleeStr + " " + args[0];
    } else {
      args.unshift(calleeStr);
    }
  }

  return args;
}

/**
 * Parses and returns info about the call stack at the given index.
 */
function getStackInfo(stackIndex) {
  // get call stack, and analyze it
  // get all file, method, and line numbers
  var stacklist = new Error().stack.split("\n").slice(3);

  // stack trace format:
  // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
  // do not remove the regex expresses to outside of this method (due to a BUG in node.js)
  var stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi;
  var stackReg2 = /at\s+()(.*):(\d*):(\d*)/gi;

  var s = stacklist[stackIndex] || stacklist[0];
  var sp = stackReg.exec(s) || stackReg2.exec(s);

  if (sp && sp.length === 5) {
    return {
      method: sp[1],
      relativePath: path.relative(PROJECT_ROOT, sp[2]),
      line: sp[3],
      pos: sp[4],
      file: path.basename(sp[2]),
      stack: stacklist.join("\n"),
    };
  }
}

const customFormat = winston.format.printf((i) => {
  return `${i.level.toUpperCase()}: ${i.timestamp} ${i.message}`;
});

// Log unhandled exceptions to separate file
var exceptionHandlers = [
  new winston.transports.DailyRotateFile({
    name: "Error Logs",
    filename: "server/logs/errlogs/exceptions-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "128m",
    maxFiles: "14d",
  }),
];

const infoAndWarnFilter = winston.format((info, opts) => {
  return info.level === "info" || info.level === "warn" ? info : false;
});

const errorFilter = winston.format((info, opts) => {
  return info.level === "error" ? info : false;
});
// timestamp({ format: timezoned })
// winston.format.timestamp(), //orig timestamp format
// Separate warn/error
var transports = [
  new winston.transports.DailyRotateFile({
    name: "Error Logs",
    filename: "server/logs/errlogs/application-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "128m",
    maxFiles: "14d",
    level: "warn",
    json: true,
    colorize: false,
    format: winston.format.combine(
      errorFilter(),
      winston.format.timestamp({ format: timezoned }),
      customFormat
    ),
  }),
  new winston.transports.DailyRotateFile({
    name: "INFO logs",
    filename: "server/logs/infologs/application-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "128m",
    maxFiles: "14d",
    json: true,
    colorize: false,
    level: "info",
    format: winston.format.combine(
      infoAndWarnFilter(),
      winston.format.timestamp({ format: timezoned }),
      customFormat
    ),
  }),
  // level: config.debugMode ? "debug" : "warn", // log warn level to console only
  new winston.transports.Console({
    level: "warn", // log warn level to console only
    handleExceptions: true,
    json: false,
    colorize: true,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
];

// level: config.debugMode ? "debug" : "info",
var logger = winston.createLogger({
  transports: transports,
  exceptionHandlers: exceptionHandlers,
  level: "debug",
  exitOnError: false,
  // Default format
  format: winston.format.combine(winston.format.timestamp(), customFormat),
});

logger.stream = {
  write: function (message) {
    logger.info(message);
  },
};

// A custom logger interface that wraps winston, making it easy to instrument
// code and still possible to replace winston in the future.

module.exports.debug = module.exports.log = function () {
  logger.debug.apply(logger, formatLogArguments(arguments));
};

module.exports.info = function () {
  logger.info.apply(logger, formatLogArguments(arguments));
};

module.exports.warn = function () {
  logger.warn.apply(logger, formatLogArguments(arguments));
};

module.exports.error = function () {
  logger.error.apply(logger, formatLogArguments(arguments));
};

module.exports.stream = logger.stream;
