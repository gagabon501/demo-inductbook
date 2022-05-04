const package = require("../package.json"); //added: 13-Mar-22
const Holiday = require("../models/holidays");
const Training = require("../models/trainings");
const Sked = require("../models/sked");
const User = require("../models/user");

const { body, validationResult } = require("express-validator/check");
const { sanitizeBody } = require("express-validator/filter");

const async = require("async");
const moment = require("moment");

const dotenv = require("dotenv");

const {
  sendHtmlMail,
  sendMail,
  exportToExcel,
  getTraining,
  formatDate,
} = require("../helpers/gaglib"); //Own lib added: 19-Jan-21

dotenv.load(); //load environment variables

exports.db_trainings = function (req, res) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  getTrainingBookings(req, res); //uses async/await
};

async function getTrainingBookings(req, res) {
  //For Trainings Tab
  const t_avail =
    req.session.company_type === "Internal" ? "Internal" : "External";

  const trainings = await getTraining(t_avail);
  console.log(trainings);

  //Following codes were added to ensure that there is an even display of cards. The idea is that the array passed to client will be stuffed with 'dummy' data
  //so as to have an even number of items. On the client side, those having dummy data will be displayed but its opacity is set to zero (not visible)
  let numCols = 6;
  let numRows = Math.ceil(trainings.length / numCols);
  let numDummies = numRows * numCols - trainings.length;
  let dummyObj = {
    train_title: "dummy",
    train_date: "",
    train_session1: "",
    train_session2: "",
    train_venue: "",
    train_pax: 0,
    train_tot_session1: 0,
    train_tot_session2: 0,
    train_avail: "",
  };

  if (numDummies > 0) {
    for (let i = 0; i < numDummies; i++) trainings.push(dummyObj); //add the dummy obect
  }

  res.render("db_trainings", {
    files: trainings,
    userlevel: req.session.level,
    username: req.session.username,
    email: req.session.email,
    version: package.version,
  });
}

exports.training_create_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  const today = new Date();
  const today1 = new Date();
  const lastDate = new Date(new Date().getFullYear(), 11, 31);
  const numDays = Math.floor(
    (lastDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
  );

  let sked = [];
  if (today.getHours() >= 15 && today1.getDay() >= 1 && today1.getDay() <= 3) {
    today1.setDate(today1.getDate() + 1); //after 3pm user can only book day after tomorrow
  } else if (today.getHours() >= 13 && today1.getDay() === 5) {
    today1.setDate(today1.getDate() + 3); //Friday after 1pm run: target start day is Tuesday following week
  } else if (today1.getDay() === 6) {
    today1.setDate(today1.getDate() + 2); //Saturday run: target start day is Tuesday following week
  } else if (today1.getDay() === 0) {
    today1.setDate(today1.getDate() + 1); //Sunday run: target start day is Tuesday following week
  }

  for (i = 0; i < numDays; i++) {
    today1.setDate(today1.getDate() + 1);

    if (today1.getDay() === 5) today1.setDate(today1.getDate() + 3); //Fri --> target start day is Monday
    if (today1.getDay() === 6) today1.setDate(today1.getDate() + 2); //Sat --> target start day is Monday
    if (today1.getDay() === 0) today1.setDate(today1.getDate() + 1); //Sun --> target start day is Monday

    sked[i] = formatDate(today1);
  }

  Holiday.find({ train_type: { $gt: 1 } }).exec(function (err, list_holiday) {
    if (err) {
      return next(err);
    }
    //Just fetch all records
    const dateToday = moment().format("YYYY-MM-DD");

    Training.find({ train_date: { $gt: dateToday } })
      .sort({ train_date: 1 })
      .exec(function (err, list_training) {
        if (err) {
          return next(err);
        }

        console.log(list_training);
        res.render("trainings", {
          files: list_training,
          datetoday: dateToday,
          holidays: list_holiday,
          inductions: sked,
          datenow: moment().format("dddd Do MMM YYYY"),
          username: req.session.username,
          userlevel: req.session.level,
          lastinductsession: process.env.NEW_TITLE_SESSION2,
          is_adding: true,
          company_type: req.session.company_type,
          runstage:
            process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
          email: req.session.email,
          version: package.version,
        });
      }); //exec() of Training.find()
  }); //Holiday.find()
}; //exports.training_create_get()

// Handle create new training POST. --> 10-Oct-20
exports.training_create_post = [
  // Validate fields.
  body("train_title")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Training Title must be specified."),
  body("train_date", "Invalid date").optional({ checkFalsy: true }).isISO8601(),
  body("train_session1")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Session-1 must be specified."),
  body("train_session2")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Session-2 must be specified."),
  body("train_venue")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Venue must be specified."),

  // Sanitize fields.
  sanitizeBody("train_title").trim().escape(),
  sanitizeBody("train_date").toDate(),
  sanitizeBody("train_session1").trim().escape(),
  sanitizeBody("train_session2").trim().escape(),
  sanitizeBody("train_venue").trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      var err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }

    //Login POST route

    if (req.body.train_date) {
      //console.log(req.body.train_avail);

      if (
        moment(req.body.train_date).format("YYYY-MM-DD") <=
        moment().format("YYYY-MM-DD")
      ) {
        req.flash(
          "error",
          "Training date cannot be lower than or equal the current date"
        );
        res.redirect("/training");
      } else {
        Training.findOne({
          train_date: moment(req.body.train_date).format("YYYY-MM-DD"),
        }).exec(function (err, train) {
          if (err) {
            return callback(err);
          } else {
            if (train) {
              req.flash(
                "error",
                "Duplicate training date found - please select another date"
              );
              res.redirect("/training");
            } else {
              var train = new Training({
                train_title: req.body.train_title,
                train_date: req.body.train_date,
                train_session1: req.body.train_session1,
                train_session2: req.body.train_session2,
                train_venue: req.body.train_venue,
                train_pax: req.body.train_pax,
                train_tot_session1: 0,
                train_tot_session2: 0,
                train_avail: req.body.train_avail,
              });

              train.save(function (err) {
                if (err) {
                  return next(err);
                }
                res.redirect("/training");
              });
            }
          }
        }); //exec
      } //moment()
    } //req.body.train_date
  }, //(req,res,next)
]; //exports.training_create_post

// Handle training delete --> 11-Oct-20
exports.training_delete_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  Training.findByIdAndRemove(req.params.id, function deleteTraining(err) {
    if (err) {
      return next(err);
    }
    res.redirect("/training");
  });
};

exports.training_update_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  //------updated codes here: 24-Oct-20----------------------
  //Get/create records for the induction
  const today = new Date();
  const today1 = new Date();
  const lastDate = new Date(new Date().getFullYear(), 11, 31);
  const numDays = Math.floor(
    (lastDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
  );

  //console.log(lastDate);
  //console.log(numDays)

  let sked = [];
  //today1.setDate(today1.getDate() - 1); //to include today's date in the Display - revision: 04-Feb-2019 --> removed: 03-Aug-20 per revision request of Vanessa F
  //Revised: 03-Aug-20 per Vanessa F request
  if (today.getHours() >= 15 && today1.getDay() >= 1 && today1.getDay() <= 3) {
    today1.setDate(today1.getDate() + 1); //after 3pm user can only book day after tomorrow
  } else if (today.getHours() >= 13 && today1.getDay() === 5) {
    today1.setDate(today1.getDate() + 3); //Friday after 1pm run: target start day is Tuesday following week
  } else if (today1.getDay() === 6) {
    today1.setDate(today1.getDate() + 2); //Saturday run: target start day is Tuesday following week
  } else if (today1.getDay() === 0) {
    today1.setDate(today1.getDate() + 1); //Sunday run: target start day is Tuesday following week
  }

  for (i = 0; i < numDays; i++) {
    today1.setDate(today1.getDate() + 1);

    if (today1.getDay() === 5) today1.setDate(today1.getDate() + 3); //Fri --> target start day is Monday
    if (today1.getDay() === 6) today1.setDate(today1.getDate() + 2); //Sat --> target start day is Monday
    if (today1.getDay() === 0) today1.setDate(today1.getDate() + 1); //Sun --> target start day is Monday

    sked[i] = formatDate(today1);
  }

  //console.log(sked);

  Holiday.find({}).exec(function (err, list_holiday) {
    if (err) {
      return next(err);
    }
    //Just fetch all records
    const dateToday = moment().format("YYYY-MM-DD");

    Training.find({ train_date: { $gt: dateToday } })
      .sort({ train_date: 1 })
      .exec(function (err, list_training) {
        if (err) {
          return next(err);
        }
        Training.findById(req.params.id, function (err, train) {
          if (err) {
            return next(err);
          }
          if (train == null) {
            // No results.
            var err = new Error("Training not found");
            err.status = 404;
            return next(err);
          }

          //console.log(list_holiday)
          res.render("training_update", {
            train_data: train,
            files: list_training,
            datetoday: dateToday,
            holidays: list_holiday,
            inductions: sked,
            datenow: moment().format("dddd Do MMM YYYY"),
            username: req.session.username,
            userlevel: req.session.level,
            lastinductsession: process.env.NEW_TITLE_SESSION2,
            is_adding: false,
            company_type: req.session.company_type,
            runstage:
              process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
            email: req.session.email,
            version: package.version,
          });
        }); //exec() of Training.findById()
      }); //exec() of Training.find()
  }); //Holiday.find()
};
//To work on this next --> 06-Feb-19
exports.training_update_post = [
  // Validate fields.
  body("train_date", "Invalid date").optional({ checkFalsy: true }).isISO8601(),
  body("train_title")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Training Title must be specified."),
  body("train_session1")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Session-1 must be specified."),
  body("train_session2")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Session-2 must be specified."),
  body("train_venue")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Venue must be specified."),

  // Sanitize fields.
  sanitizeBody("train_date").toDate(),
  sanitizeBody("train_title").trim().escape(),
  sanitizeBody("train_session1").trim().escape(),
  sanitizeBody("train_session2").trim().escape(),
  sanitizeBody("train_venue").trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      var err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }

    //console.log(req.body.train_date);

    var today = new Date();

    var train = new Training({
      train_title: req.body.train_title,
      train_session1: req.body.train_session1,
      train_session2: req.body.train_session2,
      train_venue: req.body.train_venue,
      train_pax: req.body.train_pax,
      train_avail: req.body.train_avail,
      _id: req.params.id,
    });

    Training.findByIdAndUpdate(
      req.params.id,
      train,
      {},
      function (err, theptw) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect("/training");
      }
    );
  },
];

//Added: 11-Oct-2020
exports.train_create_get = function (req, res, next) {
  trainObj = Object.values(req.query);
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  const dateToday = new Date();
  const dateTodayString = moment(dateToday).format("YYYY-MM-DD");
  const timeNow = moment(dateToday).format("HH");

  var today = new Date();
  let totrec = 0;

  async.parallel(
    {
      totrec1: function (callback) {
        Sked.countDocuments(
          {
            $and: [
              { date_attend: { $eq: formatDate(trainObj[0]) } },
              { train_id: { $eq: trainObj[1] } },
              { session: { $eq: "1" } },
            ],
          },
          callback
        ); // Pass an empty object as match condition to find all documents of this collection
      },
      totrec2: function (callback) {
        Sked.countDocuments(
          {
            $and: [
              { date_attend: { $eq: formatDate(trainObj[0]) } },
              { train_id: { $eq: trainObj[1] } },
              { session: { $eq: "2" } },
            ],
          },
          callback
        ); // Pass an empty object as match condition to find all documents of this collection
      },
      totrec: function (callback) {
        Sked.countDocuments(
          {
            $and: [
              { date_attend: { $eq: formatDate(trainObj[0]) } },
              { train_id: { $eq: trainObj[1] } },
            ],
          },
          callback
        ); // Pass an empty object as match condition to find all documents of this collection
      },
    },
    function (err, results) {
      const train_session =
        results.totrec1 >= parseInt(trainObj[2]) ? "2" : "1"; //trainObj[2] --> train_pax
      const train_session_title =
        train_session === "1" ? trainObj[4] : trainObj[5];

      var sked = new Sked({
        lastname: "lastname",
        firstname: "firstname",
        company: "company",
        phone: "phone",
        sitesafe: "123456",
        position: "position",
        lang1: "1st language",
        lang2: "2nd language",
        expiry: today,
        session: train_session,
        session_title: trainObj[3], //train_title here
        date_attend: formatDate(trainObj[0]),
        bookdate: new Date(),
        bookedby: req.session.username + "/" + req.session.email,
        emergency_person: "emergency contact person",
        emergency_phone: "emergency contact number",
        userid: req.session.userId,
        train_type: 2, // 1=Induction Booking, 2=Other trainings --> Added: 11-Oct-20 due to addition of Other Trainings as per request from Erika/Vanessa
        train_id: trainObj[1],
        train_title: trainObj[3],
        train_date: trainObj[0],
        train_session1: trainObj[4],
        train_session2: trainObj[5],
        train_venue: trainObj[6],
        train_pax: trainObj[2],
        train_avail: trainObj[7],
      });

      sked.save(function (err, objid) {
        if (err) {
          return next(err);
        }
        res.redirect(
          "/train/fillup/" +
            "?" +
            "data1=" +
            trainObj[0] +
            "&" +
            "data2=" +
            train_session +
            "&" +
            "data3=" +
            objid._id +
            "&" +
            "data4=" +
            trainObj[3] +
            "&" +
            "data5=" +
            trainObj[6] +
            "&" +
            "data6=" +
            train_session_title
        );
      });
      //res.redirect("/sked/fillup/" + "?" + "data1=" + dateval[0] + "&" + "data2=" + dateval[1] + "&" + "data3=" + objid._id + "&" + "data4=" + dateval[2]
    }
  ); //async parallel
}; //exports.sked_create_get

exports.train_display_get = function (req, res, next) {
  trainObj = Object.values(req.query);

  //console.log(trainObj);

  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  const dateToday = new Date();
  const dateTodayString = moment(dateToday).format("YYYY-MM-DD");
  const timeNow = moment(dateToday).format("HH");

  res.render("book_training", {
    train_data: trainObj,
    user: req.session.company,
    userlevel: req.session.level,
    isexpired: 0,
    obj_id: trainObj[2],
    skedtit: trainObj[3],
    company_type: req.session.company_type,
    runstage: process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
    username: req.session.username,
    email: req.session.email,
    version: package.version,
  });
};

// Handle create new booking on POST.
exports.train_create_post = [
  // Validate fields.
  body("lastname")
    .isLength({ min: 3 })
    .trim()
    .withMessage("Lastname must be specified."),
  body("firstname")
    .isLength({ min: 3 })
    .trim()
    .withMessage("Firstname must be specified."),
  body("company")
    .isLength({ min: 3 })
    .trim()
    .withMessage("Company location must be specified."),
  body("phone")
    .isLength({ min: 3 })
    .trim()
    .withMessage("Phone must be specified."),
  body("position")
    .isLength({ min: 3 })
    .trim()
    .withMessage("Position location must be specified."),
  body("lang1")
    .isLength({ min: 3 })
    .trim()
    .withMessage("1st language location must be specified."),
  body("lang2")
    .isLength({ min: 3 })
    .trim()
    .withMessage("2nd language must be specified."),

  body("sitesafe")
    .isLength({ min: 3 })
    .trim()
    .withMessage("Site Safe Card Number must be specified."),
  body("emergency_person")
    .isLength({ min: 3 })
    .trim()
    .withMessage("Emergency contact name must be specified"),
  body("emergency_phone")
    .isLength({ min: 3 })
    .trim()
    .withMessage("Emergency contact phone number must be specified"),
  body("expiry", "Invalid date of issue")
    .optional({ checkFalsy: true })
    .isISO8601(),

  // Sanitize fields.
  sanitizeBody("lastname").trim().escape(),
  sanitizeBody("firstname").trim().escape(),
  sanitizeBody("phone").trim().escape(),
  sanitizeBody("company").trim().escape(),
  sanitizeBody("position").trim().escape(),
  sanitizeBody("lang1").trim().escape(),
  sanitizeBody("lang2").trim().escape(),
  sanitizeBody("sitesafe").trim().escape(),
  sanitizeBody("emergency_person").trim().escape(),
  sanitizeBody("emergency_number").trim().escape(),
  sanitizeBody("expiry").toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      var err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }

    trainObj = Object.values(req.query);

    //console.log(`training date: ${req.body.data_date}`);

    //18-Feb-2019: Following codes were modified to suit the logic of updating the contents of the current booking once the user presses Submit button in the booking form
    Sked.find({ _id: { $eq: req.body.obj_id } }).exec(function (
      err,
      list_users
    ) {
      if (err) {
        return next(err);
      }

      //console.log(JSON.stringify(list_users));

      if (JSON.stringify(list_users) !== "[]") {
        var today = new Date();

        //IMPORTANT     : I had to make use of my helper function formatDate() - see below - to convert the date selected by the user to the correct date.
        //(10-Oct-2020)   Apparently the application when it saved to MongoDb Atlas the contents of the "date_attend" field was one day behind the
        //                actual date selected. This could probably be due to the server time where MongoDb Atlas was hosted, so I had to make this helper function.
        //
        //                Actually this trick was being used already in the INDUCTION Module part. I only discovered the solution when I started investigating
        //                on why the date was being saved correctly while in the TRAINING Module part the day is off by one day.
        //
        //LESSON        : ALWAYS CHECK THE ACTUAL DATA SAVED ON THE DATABASE IN MONGODB
        //

        var sked = new Sked({
          lastname: req.body.lastname,
          firstname: req.body.firstname,
          phone: req.body.phone,
          company: req.body.company,
          position: req.body.position,
          lang1: req.body.lang1,
          lang2: req.body.lang2,
          sitesafe: req.body.sitesafe,
          expiry: req.body.expiry,
          session: req.body.data_sked,
          session_title: req.body.data_tit,
          date_attend: formatDate(req.body.data_date),
          bookdate: new Date(),
          bookedby: req.session.username + "/" + req.session.email,
          userid: req.session.userId,
          emergency_person: req.body.emergency_person,
          emergency_phone: req.body.emergency_phone,
          _id: req.body.obj_id,
        });

        Sked.findByIdAndUpdate(
          req.body.obj_id,
          sked,
          {},
          function (err, thebooking) {
            if (err) {
              return next(err);
            }
            recvr = [req.session.email]; //email the one who booked this (currently logged-in)
            (subject = "New Booking: " + sked.firstname + " " + sked.lastname),
              (emailbody =
                "             Booking No.: " +
                sked.id +
                "\r\n" +
                "                    Name: " +
                sked.firstname +
                " " +
                sked.lastname +
                "\r\n" +
                "                   Phone: " +
                sked.phone +
                "\r\n" +
                "                 Company: " +
                sked.company +
                "\r\n" +
                "             Where to go: FCC Office, 55 Nelson Street" +
                "\r\n" +
                "           Site Safe No.: " +
                sked.sitesafe +
                " / SS Expiry: " +
                moment(sked.expiry).format("DD-MMM-YYYY") +
                "\r\n" +
                "                 Booking: " +
                moment(sked.date_attend).format("DD-MMM-YYYY") +
                " / Session: " +
                sked.session_title +
                "\r\n" +
                "Emergency contact person: " +
                sked.emergency_person +
                "\r\n" +
                "Emergency contact number: " +
                sked.emergency_phone +
                "\r\n");

            emaildata = {
              booking_num: sked.id,
              name: sked.firstname + " " + sked.lastname,
              train_title: req.body.data_tit,
              train_session: req.body.data_session_title,
              phone: sked.phone,
              company: sked.company,
              where: req.body.data_venue,
              sitesafe:
                sked.sitesafe +
                " / SS Expiry " +
                moment(sked.expiry).format("DD-MMM-YYYY"),
              booking:
                moment(sked.date_attend).format("DD-MMM-YYYY") +
                " / Session: " +
                req.body.data_session_title,
              e_person: sked.emergency_person,
              e_number: sked.emergency_phone,
            };
            //sendMail(recvr,subject,emailbody); //located at the top of this file
            sendHtmlMail(recvr, subject, emaildata, false, false); //located at the top of this file
            //sendHtmlMail(recvr, subject, emailbody, fileAttachment, isInduction)
            req.flash("success", `Confirmation email sent to: ${recvr}`);
            //res.redirect("/home");
            res.redirect("/db_trainings"); //updated: 28-Jan-21 due to UI design change
          }
        ); //Sked.findByIdAndUpdate
      } else {
        console.log("SESSION EXPIRED!");
        errmsg = "DATA not saved - session expired";
        res.render("book_training", {
          train_data: trainObj,
          user: req.session.company,
          userlevel: req.session.level,
          isexpired: 1,
          obj_id: trainObj[2],
          skedtit: trainObj[3],
          company_type: req.session.company_type,
          runstage:
            process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
          username: req.session.username,
          email: req.session.email,
          version: package.version,
        });
      } //else
    }); //exec
  }, //(req,res,next)
]; //sked_create_post

exports.train_delete_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  Sked.findByIdAndRemove(req.params.id, function cancelBook(err) {
    if (err) {
      return next(err);
    }
    res.redirect("/home");
  });
};

exports.get_sked_get = function (req, res, next) {
  Training.find()
    .sort({ train_date: 1 })
    .exec(function (err, list_training) {
      if (err) {
        return next(err);
      }
      //console.log(list_holiday)
      res.json(list_training);
    });
};

exports.train_export_get = (req, res) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }
  const today = new Date();
  let md = moment(today).format("YYYY-MM-DD"); //02-Jan-2019: today's date formatted with moment to ensure it will find the correct record in mongodb using find
  const dateval = Object.values(req.query);

  const dfrom =
    dateval[0] === undefined ? md : moment(dateval[0]).format("YYYY-MM-DD");
  const dto =
    dateval[1] === undefined ? md : moment(dateval[1]).format("YYYY-MM-DD");

  const date_from = dfrom;
  const date_to = dto;
  const showAll = dateval[0] === undefined ? true : false;
  //req.session.level, req.session.userId;

  exportTrainList(dateval, req.session.level, req.session.userId).then(
    function (result) {
      res.render("train_list", {
        files: result,
        datenow: moment(today).format("dddd Do MMM YYYY"),
        dfrom: date_from,
        dto: date_to,
        level: req.session.level,
        username: req.session.username,
        userlevel: req.session.level,
        showall: showAll,
        company_type: req.session.company_type,
        runstage:
          process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
        email: req.session.email,
        version: package.version,
      });
    }
  );
};

exports.train_booking_update_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  Sked.findById(req.params.id, function (err, booking) {
    if (err) {
      return next(err);
    }
    if (booking == null) {
      // No results.
      var err = new Error("Booking not found");
      err.status = 404;
      return next(err);
    }
    //FINALLY SOLVED THIS: To ensure that the 'expiry' field is displayed in the form (booking_update.ejs), it has to be put in a separate variable and formatted with moment('YYYY-MM-DD')
    //so that the data is received in the form in a format it recognizes ('YYYY-MM-DD') --> 06-Feb-2019
    res.render("book_training_update", {
      booking_data: booking,
      sked_id: req.params.id,
      userlevel: req.session.level,
      training_date: moment(booking.date_attend).format("YYYY-MM-DD"),
      dexpiry: moment(booking.expiry).format("YYYY-MM-DD"),
      company_type: req.session.company_type,
      runstage: process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
      username: req.session.username,
      email: req.session.email,
      version: package.version,
    });
  });
};

exports.train_booking_update_post = [
  // Validate fields.
  body("lastname")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Lastname must be specified."),
  body("firstname")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Firstname must be specified."),
  body("company")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Company location must be specified."),
  body("position")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Position must be specified."),
  body("phone")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Phone must be specified."),
  body("lang1")
    .isLength({ min: 1 })
    .trim()
    .withMessage("1st-Language must be specified."),
  body("lang2")
    .isLength({ min: 1 })
    .trim()
    .withMessage("2nd-Language must be specified."),

  // Sanitize fields.
  sanitizeBody("lastname").trim().escape(),
  sanitizeBody("firstname").trim().escape(),
  sanitizeBody("company").trim().escape(),
  sanitizeBody("phone").trim().escape(),
  sanitizeBody("position").trim().escape(),
  sanitizeBody("lang1").trim().escape(),
  sanitizeBody("lang2").trim().escape(),

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

    var sked = new Sked({
      lastname: req.body.lastname,
      firstname: req.body.firstname,
      phone: req.body.phone,
      company: req.body.company,
      position: req.body.position,
      lang1: req.body.lang1,
      lang2: req.body.lang2,
      sitesafe: req.body.sitesafe,
      expiry: req.body.expiry,
      date_attend: req.body.data_date,
      emergency_person: req.body.emergency_person,
      emergency_phone: req.body.emergency_phone,
      _id: req.params.id,
    });

    Sked.findByIdAndUpdate(req.params.id, sked, {}, function (err, theptw) {
      if (err) {
        return next(err);
      }
      // Successful - redirect to new record.
      res.redirect("/print_trainings");
      //console.log(req.headers.referer);
    });
  },
];

// Handle booking delete on POST.
exports.train_booking_delete_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  Sked.findByIdAndRemove(req.params.id, function deleteBook(err) {
    if (err) {
      return next(err);
    }
    res.redirect(req.headers.referer); //This is the solution I have been looking for - this one stays in the source route: 15-Oct-2020
    //res.redirect("/print_trainings");
    //return next //this will cause the app to hang
  });
};

//router.get('/download',ptw_controller.download_export_get);
exports.train_download_export_get = (req, res) => {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out

  if (req.session.userId) {
    //System will only download if this module was executed from "/print" route --> 24-June-20 @Auckland NZ
    const regex = /print_trainings/gi;
    //console.log(req.headers.referer);
    if (regex.test(req.headers.referer)) {
      res.download("./ListTrainAttendees.xlsx", function (err) {
        console.log(err);
      });
    } else {
      res.redirect("/print_trainings");
    }
  } else {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }
};

exports.train_email_export_get = (req, res) => {
  const prevPage = req.headers.referer; //this is the previous page

  //console.log(prevPage);

  //get users with level 4 and include them in the email: 10-Feb-2019
  User.find({ level: { $gt: 1 } }).exec(function (err, admins) {
    if (err) {
      return next(err);
    }

    var emails = [];

    admins.forEach((admin) => {
      emails.push(admin.email);
    });

    //emails = ['gagabon@safenode.co.nz'] //remove after test

    subject = "List of Training Attendees";
    emailbody = "see attachment";
    sendMail(emails, subject, emailbody, "ListTrainAttendees.xlsx"); //located at the top of this file

    req.flash("success", "Email successfully sent...");
    res.redirect(prevPage); //wow! this actually works! --> 19-Jul-20 @Auckland NZ --> the intent is that after the "Email" button was pressed, the system will just go and show the previous page
  });
};

function getTrainList(dateval, userLevel, userId) {
  //console.log("Train", dateval, userLevel, userId);
  return new Promise((resolve, reject) => {
    resolve(
      Sked.find({
        $and: [
          dateval[0] === undefined
            ? { date_attend: { $gt: moment().format("YYYY-MM-DD") } }
            : {
                date_attend: {
                  $gte: moment(dateval[0]).format("YYYY-MM-DD"),
                  $lte: moment(dateval[1]).format("YYYY-MM-DD"),
                },
              },
          { train_type: { $eq: 2 } },
          userLevel < 2 ? { userid: { $eq: userId } } : {},
        ],
      })
        .select(
          "firstname lastname phone company train_title date_attend session bookdate bookedby train_avail train_session1 train_session2 position lang1 lang2"
        )
        .sort({ date_attend: 1, session: 1 })
    );
  });
}

//Trainings here
const exportTrainList = async (dateval, userLevel, userId) => {
  const list = await getTrainList(dateval, userLevel, userId);

  const colHeadings = [
    "No.",
    "First Name",
    "Last Name",
    "Phone",
    "Position",
    "Company",
    "1st Language",
    "2nd Language",
    "Training Title",
    "Booked On",
    "Session",
    "Date Booked",
    "Booked By",
  ];

  //Discovered that the array of objects returned by the find() method has the actual data located in the '_doc' property
  let tmp = "";
  list.forEach((user) => {
    user._doc.date_attend = moment(user._doc.date_attend).format("DD-MM-YYYY"); //"_doc" --> this is a mongoose object -- discovered this by accident!
    user._doc.bookdate = moment(user._doc.bookdate).format("DD-MM-YYYY");
    user._doc.session =
      user._doc.session === "1"
        ? user._doc.train_session1
        : user._doc.train_session2;
    delete user._doc.train_session1;
    delete user._doc.train_session2;
  });

  let newList = [];

  list.forEach((user) => {
    newList.push([
      user._doc.firstname,
      user._doc.lastname,
      user._doc.phone,
      user._doc.position,
      user._doc.company,
      user._doc.lang1,
      user._doc.lang2,
      user._doc.train_title,
      user._doc.date_attend,
      user._doc.session,
      user._doc.bookdate,
      user._doc.bookedby,
    ]);
  });

  const colWidths = [5, 15, 15, 12, 25, 25, 25, 25, 50, 12, 20, 12, 50];
  const tableHeading = "LIST OF TRAINING ATTENDEES";
  const exportFilename = "ListTrainAttendees.xlsx";
  // exportToExcel(colHeadings, colWidths, newList, tableHeading, exportFilename); //For fixing: 19-Nov-21
  return list;
};
