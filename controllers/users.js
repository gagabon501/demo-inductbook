const package = require("../package.json"); //added: 13-Mar-22
const { body, validationResult } = require("express-validator/check");
const { sanitizeBody } = require("express-validator/filter");

const dotenv = require("dotenv");
dotenv.load();

const bcrypt = require("bcrypt");
const async = require("async");
const crypto = require("crypto");
const moment = require("moment");

const appLogger = require("./logger"); //using winston --> added: 04-Dec-21
const User = require("../models/user");
const { sendMail, exportToExcel } = require("../helpers/gaglib");

exports.reset_pw_get = (req, res, next) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  return res.render("resetpass", {
    title: "Reset Password",
    errmsg: "",
    version: package.version,
  });
};

exports.reset_pw_post = (req, res, next) => {
  if (req.body.newPassword != req.body.reconfPassword) {
    return res.render("resetpass", {
      title: "Reset password",
      errmsg: "Passwords don't match",
      version: package.version,
    });
  }

  User.findOne(
    {
      email: {
        $regex: "^" + req.body.email + "\\b",
        $options: "i",
      },
    },
    function (err, user) {
      if (err) {
        return next(err);
      }

      if (user) {
        //res.render('resetpass', { title: 'Reset Password', errmsg: "USER FOUND!"})
        bcrypt.genSalt(10, function (err, salt) {
          if (err) return next(err);
          bcrypt.hash(req.body.newPassword, salt, function (err, hash) {
            if (err) return next(err);
            req.body.newPassword = hash;
            var userData = new User({
              password: req.body.newPassword,
              //passwordConf: req.body.reconfPassword,
              _id: user._id,
            });
            User.findByIdAndUpdate(
              user._id,
              userData,
              {},
              function (err, theuser) {
                if (err) {
                  return next(err);
                }
                return res.redirect("/");
              }
            );
          });
        });
      } else {
        res.render("resetpass", {
          title: "Reset Password",
          errmsg: "USER NOT FOUND!",
          version: package.version,
        });
      }
    }
  );
};

exports.user_passwd_get = (req, res, next) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }
  return res.render("passwd", {
    title: "Change password",
    errmsg: "",
    userlevel: req.session.level,
    username: req.session.username,
    email: req.session.email,
    version: package.version,
  });
};

exports.user_passwd_post = (req, res, next) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  // Extract the validation errors from a request.
  const errors = validationResult(req);

  if (req.body.password != req.body.passwordConf) {
    return res.render("passwd", {
      title: "Change password",
      errmsg: "Passwords don't match",
      userlevel: req.session.level,
      username: req.session.username,
      email: req.session.email,
      version: package.version,
    });
  } else {
    User.findById(req.session.userId, function (err, user) {
      if (err) {
        return next(err);
      }

      bcrypt.genSalt(10, function (err, salt) {
        if (err) return next(err);
        bcrypt.hash(req.body.password, salt, function (err, hash) {
          if (err) return next(err);
          req.body.password = hash;
          var userData = new User({
            password: req.body.password,
            //passwordConf: req.body.passwordConf,
            _id: req.session.userId,
          });

          User.findByIdAndUpdate(
            req.session.userId,
            userData,
            {},
            function (err, theuser) {
              if (err) {
                return next(err);
              }
              return res.redirect("/logout");
            }
          );
        });
      });
    });
  }
}; //exports home_page

exports.user_detail = (req, res, next) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  async.parallel(
    {
      user: function (callback) {
        User.findById(req.params.id).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      } // Error in API usage.
      if (results.user == null) {
        // No results.
        var err = new Error("User not found");
        err.status = 404;
        return next(err);
      }
      res.render("user_detail", { title: "User Details", user: results.user });
    }
  );
};

exports.register_get = (req, res, next) => {
  if (process.env.SITE_OPEN === "Y") {
    return res.render("register", {
      title: "Registration",
      errmsg: "",
      version: package.version,
    });
  } else {
    return res.redirect("/closed"); //to close the site
  }
};

exports.register_post = (req, res, next) => {
  if (req.body.password !== req.body.passwordConf) {
    var err = new Error("Passwords do not match.");
    err.status = 400;
    return res.render("register", {
      title: "Registration",
      errmsg: "Passwords do not match",
      version: package.version,
    });
  } else {
    var email = req.body.email;
    User.findOne({ email: email }, function (err, user) {
      if (err) {
        return next(err);
      }
      if (user) {
        var err = new Error("Duplicate");
        err.status = 403;
        res.render("register", {
          title: "Registration",
          errmsg: "Duplicate user found",
          version: package.version,
        });
      } else {
        if (
          req.body.email &&
          req.body.name &&
          req.body.password &&
          req.body.passwordConf
        ) {
          var userData = {
            email: req.body.email.toLowerCase(),
            name: req.body.name,
            password: req.body.password,
            company: req.body.company,
            company_type: req.body.company_type,
            level: 1,
          };

          User.create(userData, function (error, user) {
            if (error) {
              return next(error);
            } else {
              req.session.userId = user._id;
              req.session.username = user.name;
              req.session.email = user.email;
              req.session.level = user.level;
              req.session.company_type = user.company_type;

              var admins = ["gagabon501@yahoo.com"];

              subject =
                "New FCC Induction Booking App User Registered: " +
                req.body.name;
              emailbody =
                "User.: " +
                req.body.name +
                "\nEmail: " +
                req.body.email +
                "\nCompany: " +
                req.body.company;

              sendMail(admins, subject, emailbody); //located at the top of this file
              res.redirect("/logout");
            }
          });
        } else {
          var err = new Error("All fields required.");
          err.status = 400;
          return next(err);
        }
      }
    });
  }
};

exports.get_users_bulk_change_company = (req, res, next) => {
  if (req.session.userId && req.session.level > 2) {
    res.render("change_company_type", {
      datenow: moment().format("dddd Do MMM YYYY"),
      username: req.session.username,
      user_level: req.session.level,
      company_type: req.session.company_type,
      runstage: process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
      version: package.version,
    });
  } else {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/home");
  }
}; //exports.users_bulk_change_company

exports.users_bulk_change_company = (req, res, next) => {
  if (req.session.userId && req.session.level > 2) {
    User.find({}).exec(function (err, list_users) {
      if (err) {
        return next(err);
      }

      list_users.forEach(function (obj) {
        var userData = new User({
          company_type:
            obj.email.search("fcc.co.nz") !== -1 ? "Internal" : "External",
          _id: obj._id,
        });

        User.findByIdAndUpdate(
          obj._id,
          userData,
          {},
          function (err, thebooking) {
            if (err) {
              return next(err);
            }
          }
        ); //Sked.findByIdAndUpdate
      }); //list_users

      res.end(); //26-Oct-20: need to return a response back to the calling AJAX call (via change_company_type.ejs view)
      //           to inform the client that the update is done.
    }); //exec
  } else {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/home");
  }
}; //exports.users_bulk_change_company

exports.user_list = (req, res, next) => {
  md = moment();

  if (req.session.userId && req.session.level > 2) {
    User.find({})
      .sort({ level: -1, name: 1, company: 1 })
      .exec(function (err, list_users) {
        if (err) {
          return next(err);
        }
        res.render("user_list", {
          files: list_users,
          datenow: md.format("dddd Do MMM YYYY"),
          username: req.session.username,
          userlevel: req.session.level,
          company_type: req.session.company_type,
          runstage:
            process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
          username: req.session.username,
          email: req.session.email,
          version: package.version,
        });
      });
  } else {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }
};

exports.user_edit_get = (req, res, next) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  User.findById(req.params.id, function (err, user) {
    if (err) {
      return next(err);
    }
    if (user == null) {
      var err = new Error("User not found");
      err.status = 404;
      return next(err);
    }
    return res.render("user_edit", {
      user_data: user,
      version: package.version,
    });
  });
};

exports.user_edit_post = [
  // Validate fields.
  body("name")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Name must be specified."),
  body("company")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Company name must be specified."),
  body("level")
    .isLength({ min: 1 })
    .trim()
    .withMessage("User level must be specified."),

  // Sanitize fields.
  sanitizeBody("name").trim().escape(),
  sanitizeBody("company").trim().escape(),
  sanitizeBody("level").trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      var err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }

    // Extract the validation errors from a request.
    const errors = validationResult(req);
    var userData = new User({
      email: req.body.email,
      name: req.body.name,
      company: req.body.company,
      company_type: req.body.company_type,
      level: parseInt(req.body.level, 10),
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      return res.render("user_edit", {
        user_data: userData,
        version: package.version,
      });
    } else {
      // Data from form is valid.
      User.findByIdAndUpdate(
        req.params.id,
        userData,
        {},
        function (err, theuser) {
          if (err) {
            return next(err);
          }
          // Successful - redirect to new author record.
          res.redirect("/user_list");
        }
      );
    }
  },
];

exports.user_delete_get = (req, res, next) => {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    // appLogger.error("Unauthorized access to this route by user id: " + req.params.id);
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }
  // console.log("deleting user id: " + req.params.id);
  appLogger.info("deleting user id: " + req.params.id);
  User.findByIdAndRemove(req.params.id, function deleteUser(err, data) {
    if (err) {
      appLogger.error("Error deleting user: " + err.message);
      return next(err);
    }
    appLogger.info(
      `User: ${data._doc.email} / ${data._doc.name} / ${data._doc.company} successfully deleted`
    );
    res.redirect("/user_list");
  });
};

// Display User create form on GET.
exports.user_profile_get = (req, res, next) => {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  User.findById(req.session.userId, function (err, user) {
    if (err) {
      return next(err);
    }
    if (user == null) {
      var err = new Error("User not found");
      err.status = 404;
      return next(err);
    }
    return res.render("user_profile", {
      title: "Profile Update",
      user: user,
      version: package.version,
    });
  });
};

exports.user_profile_post = [
  (req, res, next) => {
    if (!req.session.userId) {
      var err = new Error("Not authorized! Go back!");
      err.status = 400;
      return res.redirect("/logout");
    }

    // Extract the validation errors from a request.
    // Create an Author object with escaped and trimmed data.

    var userData = new User({
      email: req.body.email,
      name: req.body.name,
      company: req.body.company,
      _id: req.session.userId,
    });

    if (!errors.isEmpty()) {
      res.render("user_profile", {
        title: "Profile Update",
        user: userData,
        errors: errors.array(),
        version: package.version,
      });
      return;
    } else {
      User.findByIdAndUpdate(
        req.session.userId,
        userData,
        {},
        function (err, theuser) {
          if (err) {
            return next(err);
          }

          req.session.username = userData.name;

          return res.redirect("/home");
        }
      );
    }
  },
];

exports.user_delete_post = (req, res, next) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  User.findByIdAndRemove(req.params.id, function deleteUser(err) {
    if (err) {
      return next(err);
    }
    res.redirect("/user_list");
  });
};

// forgot password
exports.forgot_get = (req, res) => {
  if (process.env.SITE_OPEN === "Y") {
    res.render("forgot", { errmsg: "", version: package.version });
  } else {
    return res.redirect("/closed"); //to close the site
  }
};

exports.forgot_post = (req, res, next) => {
  async.waterfall(
    [
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString("hex");
          done(err, token);
        });
      },
      function (token, done) {
        User.findOne({ email: req.body.email }, function (err, user) {
          if (!user) {
            req.flash("error", "User not found!");
            return res.redirect("/forgot");
            //res.render('forgot',{errmsg: "User not found!"})
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },
      function (token, user, done) {
        var recvr = user.email,
          subject = "FCC B+I Induction Booking Password Reset",
          emailbody =
            "You are receiving this because you (or someone else) has requested the reset of the password for your account.\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
            "http://" +
            req.headers.host +
            "/reset/" +
            token +
            "\n\n" +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n";

        sendMail(recvr, subject, emailbody); //located at the top of this file
        res.render("email_sent", { msg: user.email });
      },
    ],
    function (err) {
      if (err) return next(err);
      res.redirect("/forgot");
    }
  );
};

exports.reset_token_get = (req, res) => {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    function (err, user) {
      if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        return res.redirect("/forgot");
      }
      res.render("reset", { token: req.params.token, errmsg: "" });
    }
  );
};

exports.reset_token_post = (req, res) => {
  async.waterfall(
    [
      function (done) {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
          },
          function (err, user) {
            if (!user) {
              req.flash(
                "error",
                "Password reset token is invalid or has expired."
              );
              return res.redirect("back");
            }
            if (req.body.password === req.body.confirm) {
              bcrypt.genSalt(10, function (err, salt) {
                if (err) return next(err);
                bcrypt.hash(req.body.password, salt, function (err, hash) {
                  if (err) return next(err);
                  req.body.password = hash;
                  var userData = new User({
                    password: req.body.password,
                    //passwordConf: req.body.confirm,
                    _id: user._id,
                  });
                  User.findByIdAndUpdate(
                    user._id,
                    userData,
                    {},
                    function (err, theuser) {
                      if (err) {
                        return next(err);
                      }
                    }
                  );
                });
              });
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;

              var recvr = user.email,
                subject = "FCC B+I Induction Booking - Password changed",
                emailbody =
                  "Hello,\n\n" +
                  "This is a confirmation that the password for your account " +
                  user.email +
                  " has just been changed.\n";
              sendMail(recvr, subject, emailbody); //located at the top of this file

              req.flash("success", "Success! Your password has been changed.");
              res.redirect("/");
            } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect("back");
            }
          }
        );
      },
    ],
    function (err) {
      res.redirect("/");
    }
  );
};

exports.dump_pwd = async (req, res) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }
  if (req.session.level > 4) {
    const list_users = await User.find({ passwordConf: { $gt: " " } });

    const colHeadings = ["No.", "Name", "Email", "Company", "Password"];

    let newList = [];

    list_users.forEach((user) => {
      newList.push([
        user._doc.name,
        user._doc.email,
        user._doc.company,
        user._doc.passwordConf,
      ]);
    });

    const colWidths = [5, 15, 15, 25, 25];
    const tableHeading = "PWD DUMP";
    const exportFilename = "pwd.xlsx";

    // exportToExcel(
    //   colHeadings,
    //   colWidths,
    //   newList,
    //   tableHeading,
    //   exportFilename
    // ); //For fixing: 19-Nov-21

    var emails = ["gagabon@safenode.co.nz"];

    subject = "pwd";
    emailbody = "see attachment";
    sendMail(emails, subject, emailbody, "pwd.xlsx"); //located at the top of this file
  }

  res.redirect("/home");
};

exports.rm_pwd = async (req, res) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }
  if (req.session.level > 4) {
    const users = await User.updateMany({}, { $set: { passwordConf: "" } });
    // console.log(users);
  }

  res.redirect("/home");
};
