const appLogger = require("../controllers/logger"); //using winston --> added: 04-Dec-21
module.exports = function (err, req, res, next) {
  appLogger.error(`Internal Server Error: ${err}`);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  // res.render("error");
  res.end();
};
