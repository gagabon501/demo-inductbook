const { body, validationResult } = require("express-validator/check");
const { sanitizeBody } = require("express-validator/filter");
const moment = require("moment");
const package = require("../package.json");

const Holiday = require("../models/holidays");

// Handle create new holiday GET. --> 06-Feb-19
exports.holiday_create_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  //Just fetch all records
  let isEdit = 0;
  const dholiday = moment().format("YYYY-MM-DD");
  const md = moment();

  Holiday.find()
    .sort({ date_holiday: 1 })
    .exec(function (err, list_holiday) {
      if (err) {
        return next(err);
      }
      //console.log(list_holiday)
      res.render("holidays", {
        files: list_holiday,
        isedit: isEdit,
        dholiday: dholiday,
        datenow: md.format("dddd Do MMM YYYY"),
        username: req.session.username,
        userlevel: req.session.level,
        email: req.session.email,
        company_type: req.session.company_type,
        runstage:
          process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
        version: package.version,
      });
    });
};

// Handle create new holiday POST. --> 06-Feb-19
exports.holiday_create_post = [
  // Validate fields.
  body("holiday_date", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601(),
  body("holiday_short_name")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Short Name must be specified."),
  body("holiday_desc")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Description must be specified."),

  // Sanitize fields.
  sanitizeBody("holiday_short_name").trim().escape(),
  sanitizeBody("holiday_desc").trim().escape(),
  sanitizeBody("holiday_date").toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      var err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }

    var holiday = new Holiday({
      date_holiday: req.body.holiday_date,
      holiday_name: req.body.holiday_desc,
      short_name: req.body.holiday_short_name,
      train_type: parseInt(req.body.train_type),
    });

    holiday.save(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/holiday");
    });
  },
];

//To work on this next --> 06-Feb-19
exports.holiday_update_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  var isEdit = 1;

  Holiday.findById(req.params.id, function (err, holiday) {
    if (err) {
      return next(err);
    }
    if (holiday == null) {
      // No results.
      var err = new Error("Holiday not found");
      err.status = 404;
      return next(err);
    }
    //console.log(holiday)
    var dholiday = moment(holiday.date_holiday).format("YYYY-MM-DD");
    res.render("holidays_update", {
      holiday_data: holiday,
      datenow: new Date(),
      dholiday: dholiday,
      company_type: req.session.company_type,
      runstage: process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
      version: package.version,
    });
  });
};

//To work on this next --> 06-Feb-19
exports.holiday_update_post = [
  body("holiday_date", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601(),
  body("holiday_short_name")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Short Name must be specified."),
  body("holiday_desc")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Description must be specified."),

  // Sanitize fields.
  sanitizeBody("holiday_short_name").trim().escape(),
  sanitizeBody("holiday_desc").trim().escape(),
  sanitizeBody("holiday_date").toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      var err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }

    var today = new Date();
    //console.log(typeof req.body.train_type) //string

    var holiday = new Holiday({
      date_holiday: req.body.holiday_date,
      holiday_name: req.body.holiday_desc,
      short_name: req.body.holiday_short_name,
      train_type: parseInt(req.body.train_type),
      _id: req.params.id,
    });

    Holiday.findByIdAndUpdate(
      req.params.id,
      holiday,
      {},
      function (err, theptw) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect("/holiday");
      }
    );
  },
];

// Handle holiday delete --> 06-Feb-19 --> still to work on this --> DONE. 06-Feb-19
exports.holiday_delete_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  Holiday.findByIdAndRemove(req.params.id, function deleteHoliday(err) {
    if (err) {
      return next(err);
    }
    res.redirect("/holiday");
  });
};
