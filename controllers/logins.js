const sio = require("../helpers/socketio");

const dotenv = require("dotenv");
dotenv.load();

const User = require("../models/user");

const package = require("../package.json");
const appLogger = require("../controllers/logger"); //using winston

console.log(package.version);

// Login GET route
exports.login_get = (req, res, next) => {
  if (process.env.SITE_OPEN === "Y") {
    return res.render("login", {
      title: "Login",
      errmsg: "",
      version: package.version,
    });
  } else {
    return res.redirect("/closed"); //to close the site
  }
};

//Login POST route
exports.login_post = async (req, res, next) => {
  if (req.body.logemail && req.body.logpassword) {
    User.authenticate(
      req.body.logemail.toLowerCase(),
      req.body.logpassword,
      function (error, user) {
        if (error || !user) {
          var err = new Error("Wrong email or password.");
          err.status = 401;
          return res.render("login", {
            title: "Login",
            errmsg: err.message,
            version: package.version,
          });
        } else {
          req.session.userId = user._id;
          req.session.username = user.name;
          req.session.email = user.email;
          req.session.level = user.level;
          req.session.company = user.company;
          req.session.company_type = user.company_type;
          req.session.login_date_time = new Date();
          console.log(
            `${user.email}/${user.level}/${req.ip} logged in on ${req.session.login_date_time}`
          );
          appLogger.info(
            `${user.email}/${user.level}/${req.ip} logged-in on ${req.session.login_date_time}`
          );
          res.redirect("/home");
        }
      }
    );
  }
};

// GET for logout logout
exports.logout_get = (req, res, next) => {
  if (req.session) {
    appLogger.info(
      `${req.session.email}/${req.session.level} logged-out on ${new Date()}`
    );
    // delete session object
    req.session.destroy(function (err) {
      if (err) {
        return next(err);
      } else {
        return res.redirect("/login");
      }
    });
  }
};
