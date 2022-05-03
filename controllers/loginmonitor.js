const sio = require("../helpers/socketio");
const package = require("../package.json"); //added: 13-Mar-22

exports.login_monitor_get = (req, res) => {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  if (req.session.level < 2) {
    res.redirect("/home");
  }

  res.render("loginmonitor", {
    userlevel: req.session.level,
    username: req.session.username,
    email: req.session.email,
    version: package.version,
  })
}
