const { getExcelRowCol } = require("excel4node/distribution/lib/utils");
const sio = require("../helpers/socketio");

exports.chat_get = (req, res) => {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  res.render("chat", {
    userlevel: req.session.level,
    username: req.session.email,
    email: req.session.email,
  });
};
