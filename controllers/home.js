const dotenv = require("dotenv");
const package = require("../package.json");
dotenv.load();
const {
  sendHtmlMail,
  sendMail,
  exportToExcel,
  getSettings,
  getSkeds,
  getBooking,
} = require("../helpers/gaglib"); //Own lib added: 19-Jan-21

exports.index = function (req, res, next) {
  if ((process.env.SITE_OPEN = "Y")) {
    return res.redirect("/login");
  } else {
    return res.redirect("/closed"); //to close the site
  }
};

exports.undercons_get = function (req, res, next) {
  return res.render("site_closed", {
    title: "Site Closed",
    errmsg: "COVID-19 lockdown",
  });
};

exports.home_page = async function (req, res, next) {
  const settings = await getSettings();
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }
  res.render("maindashboard", {
    userlevel: req.session.level,
    username: req.session.username,
    email: req.session.email,
    version: package.version,
    settings,
  });
  //getBookingSked(req, res); //uses async/await
};
