const Sked = require("../models/sked");
const GenSked = require("../models/gensked");
const User = require("../models/user");
const Holiday = require("../models/holidays");
const { body } = require("express-validator/check");
const { sanitizeBody } = require("express-validator/filter");
const moment = require("moment");
const async = require("async");
const package = require("../package.json");

const {
  sendHtmlMail,
  sendMail,
  exportToExcel,
  formatDate,
} = require("../helpers/gaglib"); //Own lib added: 19-Jan-21

//Dashboard
exports.db_genskeds = function (req, res) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  getGenSkedsBookings(req, res); //uses async/await
};

const getGenSkedsBookings = async (req, res) => {
  //For Other Bookings Tab
  const genskeds = await getGenSkedList();

  numCols = 6;
  numRows = Math.ceil(genskeds.length / numCols);
  numDummies = numRows * numCols - genskeds.length;

  dummyObj = {
    gensked_title: "dummy",
    gensked_date: "",
    gensked_session: "",
    gensked_venue: "",
    gensked_pax: 0,
    gensked_tot_booking: 0,
  };

  if (numDummies > 0) {
    for (let i = 0; i < numDummies; i++) genskeds.push(dummyObj); //add the dummy obect
  }

  res.render("db_genskeds", {
    genskeds,
    userlevel: req.session.level,
    username: req.session.username,
    email: req.session.email,
    version: package.version,
  });
};

const getGenSkedList = () => {
  const md1 = moment().format("YYYY-MM-DDT00:00:00.000") + "Z";
  return new Promise((resolve, reject) => {
    resolve(GenSked.find({ gensked_date: { $gt: md1 } }));
  });
};

// Handle create new training GET. --> 10-Oct-20
exports.gensked_create_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

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

  Holiday.find({ train_type: { $gt: 1 } }).exec(function (err, list_holiday) {
    if (err) {
      return next(err);
    }
    //Just fetch all records
    const dateToday = moment().format("YYYY-MM-DD");

    GenSked.find({ gensked_date: { $gt: dateToday } })
      .sort({ gensked_date: 1 })
      .exec(function (err, list_skeds) {
        if (err) {
          return next(err);
        }

        //console.log(list_holiday)
        res.render("gensked", {
          files: list_skeds,
          datetoday: dateToday,
          holidays: list_holiday,
          inductions: sked,
          datenow: moment().format("dddd Do MMM YYYY"),
          username: req.session.username,
          email: req.session.email,
          userlevel: req.session.level,
          lastinductsession: process.env.NEW_TITLE_SESSION2,
          is_adding: true,
          company_type: req.session.company_type,
          runstage:
            process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
          version: package.version,
        });
      }); //exec() of Training.find()
  }); //Holiday.find()
}; //exports.training_create_get()

// Handle create new training POST. --> 10-Oct-20
exports.gensked_create_post = [
  // Validate fields.
  body("gensked_title")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Title must be specified."),
  body("gensked_date", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601(),
  body("train_venue")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Venue must be specified."),

  // Sanitize fields.
  sanitizeBody("gensked_title").trim().escape(),
  sanitizeBody("gensked_date").toDate(),
  sanitizeBody("train_venue").trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      const err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }

    if (req.body.gensked_date) {
      if (
        moment(req.body.gensked_date).format("YYYY-MM-DD") <=
        moment().format("YYYY-MM-DD")
      ) {
        req.flash(
          "error",
          "Booking date cannot be lower than or equal the current date"
        );
        res.redirect("/gensked");
      } else {
        const gensked = new GenSked({
          gensked_title: req.body.gensked_title,
          gensked_date: req.body.gensked_date,
          gensked_session: req.body.gensked_session,
          gensked_venue: req.body.gensked_venue,
          gensked_pax: req.body.gensked_pax,
          gensked_tot_booking: 0,
          gensked_avail: req.body.gensked_avail,
        });

        gensked.save(function (err) {
          if (err) {
            return next(err);
          }
          res.redirect("/gensked");
        });
      }
    } //moment()
  }, //req.body.train_date
]; //exports.training_create_post

// Handle training delete --> 11-Oct-20
exports.gensked_delete_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  GenSked.findByIdAndRemove(req.params.id, function deleteGenSked(err) {
    if (err) {
      return next(err);
    }
    res.redirect("/gensked");
  });
};

exports.gensked_update_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

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

    GenSked.find({ gensked_date: { $gt: dateToday } })
      .sort({ gensked_date: 1 })
      .exec(function (err, list_training) {
        if (err) {
          return next(err);
        }
        GenSked.findById(req.params.id, function (err, gensked) {
          if (err) {
            return next(err);
          }
          if (gensked == null) {
            // No results.
            const err = new Error("Booking not found");
            err.status = 404;
            return next(err);
          }

          //console.log(list_holiday)
          res.render("gensked_update", {
            gensked_data: gensked,
            files: list_training,
            datetoday: dateToday,
            holidays: list_holiday,
            inductions: sked,
            datenow: moment().format("dddd Do MMM YYYY"),
            username: req.session.username,
            userlevel: req.session.level,
            email: req.session.email,
            lastinductsession: process.env.NEW_TITLE_SESSION2,
            is_adding: false,
            company_type: req.session.company_type,
            runstage:
              process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
            version: package.version,
          });
        }); //exec() of Training.findById()
      }); //exec() of Training.find()
  }); //Holiday.find()

  //---------------------------------------------------------
}; //exports.gensked_update_get

exports.gensked_update_post = [
  // Validate fields.
  body("gensked_date", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601(),
  body("gensked_title")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Title must be specified."),
  body("train_venue")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Venue must be specified."),

  // Sanitize fields.
  sanitizeBody("gensked_date").toDate(),
  sanitizeBody("gensked_title").trim().escape(),
  sanitizeBody("gensked_venue").trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      const err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }

    //console.log(req.body.train_date);

    const gensked = new GenSked({
      gensked_title: req.body.gensked_title,
      gensked_session: req.body.gensked_session,
      gensked_venue: req.body.gensked_venue,
      gensked_pax: req.body.gensked_pax,
      _id: req.params.id,
    });

    GenSked.findByIdAndUpdate(
      req.params.id,
      gensked,
      {},
      function (err, theptw) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect("/gensked");
      }
    );
  },
];

exports.book_create_get = function (req, res, next) {
  genskedObj = Object.values(req.query);
  //console.log(`Contents of genskedObj from gensked_create_get: ${genskedObj}`);

  //console.log(`contents of dateval ${ dateval }`); //to peek contents of this object
  //Contents of dateval array: [0]-Date of training, [1]=training_id, [2]=num_pax or the maximum number of participants per session

  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  const dateToday = new Date();
  const dateTodayString = moment(dateToday).format("YYYY-MM-DD");
  const timeNow = moment(dateToday).format("HH");
  //const isExpired = dateTodayString === dateval[0] && parseInt(timeNow) > 8 ? 1 : 0; //added: 04-Feb-19

  //Following codes were added: 18-Feb-19 --> this is to ensure that once a user clicks on book now, a new record shall be created immediately.
  //This trick of auto-adding a record is to ensure that total available slots are updated immediately. However if user cancels such record will be deleted.
  //Deleting is done every time the system is routed to /home.

  const today = new Date();
  let totrec = 0;

  /*
    <input id="data_gensked_date" type="hidden" name="data_gensked_date" value=<%= moment(genskeds[k].gensked_date).format('DD-MMM-YYYY') %>>
    <input id="data_gensked_id" type="hidden" name="data_gensked_id" value=<%= genskeds[k]._id %>>
    <input id="data_gensked_pax" type="hidden" name="data_gensked_pax" value=<%= genskeds[k].gensked_pax %>>
    <input id="data_gensked_title" type="hidden" name="data_gensked_title" value="<%= genskeds[k].gensked_title %>">
    <input id="data_gensked_session" type="hidden" name="data_gensked_session" value="<%= genskeds[k].gensked_session %>">
    <input id="data_gensked_venue" type="hidden" name="data_gensked_venue" value="<%= genskeds[k].gensked_venue %>">

*/

  async.parallel(
    {
      totrec: function (callback) {
        Sked.countDocuments(
          {
            $and: [
              { gensked_date: { $eq: formatDate(genskedObj[0]) } },
              { gensked_id: { $eq: genskedObj[1] } },
              { session: { $eq: genskedObj[4] } },
            ],
          },
          callback
        ); // Pass an empty object as match condition to find all documents of this collection
      },
    },
    function (err, results) {
      const sked = new Sked({
        lastname: "lastname",
        firstname: "firstname",
        company: "company",
        phone: "phone",
        sitesafe: "123456",
        expiry: today,
        session: genskedObj[4],
        session_title: genskedObj[3],
        date_attend: formatDate(genskedObj[0]),
        bookdate: new Date(),
        bookedby: req.session.username + "/" + req.session.email,
        emergency_person: "emergency contact person",
        emergency_phone: "emergency contact number",
        userid: req.session.userId,
        train_type: 3, // 1=Induction Booking, 2=Other trainings, 3=Other Types of Bookings --> Revised: 16-Jan-21 due to addition of Other Types Of Booking as per request from Tanja
        train_id: genskedObj[1],
        train_title: genskedObj[3],
        train_date: formatDate(genskedObj[0]),
        train_session1: genskedObj[4],
        train_session2: genskedObj[4],
        train_venue: genskedObj[5],
        train_pax: genskedObj[2],
        train_avail: "na",
      });

      sked.save(function (err, objid) {
        if (err) {
          return next(err);
        }
        res.redirect(
          "/book_gensked/fillup/" +
            "?" +
            "data1=" +
            genskedObj[0] +
            "&" +
            "data2=" +
            genskedObj[4] +
            "&" +
            "data3=" +
            objid._id +
            "&" +
            "data4=" +
            genskedObj[3] +
            "&" +
            "data5=" +
            genskedObj[5] +
            "&" +
            "data6=" +
            genskedObj[4]
        );
      });
      //res.redirect("/sked/fillup/" + "?" + "data1=" + dateval[0] + "&" + "data2=" + dateval[1] + "&" + "data3=" + objid._id + "&" + "data4=" + dateval[2]
    }
  ); //async parallel
}; //exports.sked_create_get

exports.book_fillup = function (req, res, next) {
  trainObj = Object.values(req.query);

  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  const dateToday = new Date();
  const dateTodayString = moment(dateToday).format("YYYY-MM-DD");
  const timeNow = moment(dateToday).format("HH");

  res.render("book_gensked", {
    train_data: trainObj,
    user: req.session.company,
    userlevel: req.session.level,
    username: req.session.username,
    email: req.session.email,
    isexpired: 0,
    obj_id: trainObj[2],
    skedtit: trainObj[3],
    company_type: req.session.company_type,
    runstage: process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
    version: package.version,
  });
};

// Handle create new booking on POST.
exports.book_create_post = [
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
  body("phone")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Phone must be specified."),
  body("sitesafe")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Site Safe Card Number must be specified."),
  body("emergency_person")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Emergency contact name must be specified"),
  body("emergency_phone")
    .isLength({ min: 1 })
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
  sanitizeBody("sitesafe").trim().escape(),
  sanitizeBody("emergency_person").trim().escape(),
  sanitizeBody("emergency_number").trim().escape(),
  sanitizeBody("expiry").toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      const err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }

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
        const today = new Date();

        //IMPORTANT     : I had to make use of my helper function formatDate() - see below - to convert the date selected by the user to the correct date.
        //(10-Oct-2020)   Apparently the application when it saved to MongoDb Atlas the contents of the "date_attend" field was one day behind the
        //                actual date selected. This could probably be due to the server time where MongoDb Atlas was hosted, so I had to make this helper function.
        //
        //                Actually this trick was being used already in the INDUCTION Module part. I only discovered the solution when I started investigating
        //                on why the date was being saved correctly while in the TRAINING Module part the day is off by one day.
        //
        //LESSON        : ALWAYS CHECK THE ACTUAL DATA SAVED ON THE DATABASE IN MONGODB
        //

        const sked = new Sked({
          lastname: req.body.lastname,
          firstname: req.body.firstname,
          phone: req.body.phone,
          company: req.body.company,
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
            res.redirect("/home");
          }
        ); //Sked.findByIdAndUpdate
      } else {
        console.log("SESSION EXPIRED!");
        errmsg = "DATA not saved - session expired";
        res.render("book_gensked", {
          train_data: trainObj,
          user: req.session.company,
          userlevel: req.session.level,
          username: req.session.username,
          email: req.session.email,
          isexpired: 1,
          obj_id: trainObj[2],
          skedtit: trainObj[3],
          company_type: req.session.company_type,
          runstage:
            process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
          version: package.version,
        });
      } //else
    }); //exec
  }, //(req,res,next)
]; //sked_create_post

exports.book_delete_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  Sked.findByIdAndRemove(req.params.id, function cancelBook(err) {
    if (err) {
      return next(err);
    }
    //res.redirect("/home");
    res.redirect(req.headers.referer);
  });
};

exports.book_cancel_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  Sked.findByIdAndRemove(req.params.id, function cancelBook(err) {
    if (err) {
      return next(err);
    }
    res.redirect("/home");
    //res.redirect(req.headers.referer);
  });
};

exports.get_gensked_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }
  GenSked.find()
    .sort({ gensked_date: 1 })
    .exec(function (err, list_training) {
      if (err) {
        return next(err);
      }
      //console.log(list_holiday)
      res.json(list_training);
    });
};

exports.gensked_export_get = (req, res) => {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  const today = new Date();
  const dateval = Object.values(req.query);
  //following variables are used for the searching of records: 06-Feb-19
  const md = moment(today).format("YYYY-MM-DD"); //02-Jan-2019: today's date formatted with moment to ensure it will find the correct record in mongodb using find
  const dfrom =
    dateval[0] === undefined ? md : moment(dateval[0]).format("YYYY-MM-DD");
  const dto =
    dateval[1] === undefined ? md : moment(dateval[1]).format("YYYY-MM-DD");

  const date_from = dfrom;
  const date_to = dto;
  const showAll = dateval[0] === undefined ? true : false;

  exportGenSkedList(dateval, req.session.level, req.session.userId).then(
    function (result) {
      res.render("gensked_list", {
        files: result,
        datenow: moment(today).format("dddd Do MMM YYYY"),
        dfrom: date_from,
        dto: date_to,
        level: req.session.level,
        username: req.session.username,
        userlevel: req.session.level,
        email: req.session.email,
        showall: showAll,
        company_type: req.session.company_type,
        runstage:
          process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
        version: package.version,
      });
    }
  );
};

exports.gensked_booking_update_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
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
      const err = new Error("Booking not found");
      err.status = 404;
      return next(err);
    }
    //FINALLY SOLVED THIS: To ensure that the 'expiry' field is displayed in the form (booking_update.ejs), it has to be put in a separate variable and formatted with moment('YYYY-MM-DD')
    //so that the data is received in the form in a format it recognizes ('YYYY-MM-DD') --> 06-Feb-2019
    res.render("book_gensked_update", {
      userlevel: req.session.level,
      username: req.session.username,
      email: req.session.email,
      booking_data: booking,
      sked_id: req.params.id,
      training_date: moment(booking.date_attend).format("YYYY-MM-DD"),
      dexpiry: moment(booking.expiry).format("YYYY-MM-DD"),
      company_type: req.session.company_type,
      runstage: process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
      version: package.version,
    });
  });
};

exports.gensked_booking_update_post = [
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

  // Sanitize fields.
  sanitizeBody("lastname").trim().escape(),
  sanitizeBody("firstname").trim().escape(),
  sanitizeBody("company").trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      const err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }

    const today = new Date();

    const sked = new Sked({
      lastname: req.body.lastname,
      firstname: req.body.firstname,
      phone: req.body.phone,
      company: req.body.company,
      _id: req.params.id,
    });

    Sked.findByIdAndUpdate(req.params.id, sked, {}, function (err, theptw) {
      if (err) {
        return next(err);
      }
      // Successful - redirect to new record.
      res.redirect("/print_genskeds");
      //console.log(req.headers.referer);
    });
  },
];

exports.gensked_download_export_get = (req, res) => {
  if (req.session.userId) {
    //System will only download if this module was executed from "/print" route --> 24-June-20 @Auckland NZ
    const regex = /print_genskeds/gi;
    //console.log(req.headers.referer);
    if (regex.test(req.headers.referer)) {
      res.download("./ListOthersAttendees.xlsx", function (err) {
        console.log(err);
      });
    } else {
      res.redirect("/print_genskeds");
    }
  } else {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }
};

exports.gensked_email_export_get = (req, res) => {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  const prevPage = req.headers.referer; //this is the previous page

  //console.log(prevPage);

  //get users with level 4 and include them in the email: 10-Feb-2019
  User.find({ level: { $gt: 1 } }).exec(function (err, admins) {
    if (err) {
      return next(err);
    }

    const emails = [];

    admins.forEach((admin) => {
      emails.push(admin.email);
    });

    //emails = ['gagabon@safenode.co.nz'] //remove after test

    subject = "List of Attendees - Other Bookings";
    emailbody = "see attachment";
    sendMail(emails, subject, emailbody, "ListOthersAttendees.xlsx"); //located at the top of this file

    req.flash("success", "Email successfully sent...");
    res.redirect(prevPage); //wow! this actually works! --> 19-Jul-20 @Auckland NZ --> the intent is that after the "Email" button was pressed, the system will just go and show the previous page
  });
};

exports.get_level = async function (req, res) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }
  GenSked.updateMany(
    {},
    {
      gensked_venue:
        "First Aid container - Level 3 (NZICC) near the loading bay",
    },
    function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        console.log("Updated Docs : ", docs);
        res.redirect("/home");
      }
    }
  );
};

function getGenSkidList(dateval, userLevel, userId) {
  //console.log(typeof userLevel, userLevel);
  //console.log("GenSked", dateval, userLevel, userId);
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
          { train_type: { $eq: 3 } },
          userLevel < 2 ? { userid: { $eq: userId } } : {},
        ],
      })
        .select(
          "firstname lastname phone company train_title date_attend session bookdate bookedby"
        )
        .sort({ date_attend: 1 })
    );
  });
}

const exportGenSkedList = async (dateval, userLevel, userId) => {
  const list = await getGenSkidList(dateval, userLevel, userId);
  //console.log(list);
  const colHeadings = [
    "No.",
    "First Name",
    "Last Name",
    "Phone",
    "Company",
    "Title",
    "Booked On",
    "Session",
    "Date Booked",
    "Booked By",
  ];

  //Discovered that the array of objects returned by the find() method has the actual data located in the '_doc' property
  list.forEach((user) => {
    user._doc.date_attend = moment(user._doc.date_attend).format("DD-MM-YYYY"); //"_doc" --> this is a mongoose object -- discovered this by accident!
    user._doc.bookdate = moment(user._doc.bookdate).format("DD-MM-YYYY");
  });

  let newList = [];

  list.forEach((user) => {
    newList.push([
      user._doc.firstname,
      user._doc.lastname,
      user._doc.phone,
      user._doc.company,
      user._doc.train_title,
      user._doc.date_attend,
      user._doc.session,
      user._doc.bookdate,
      user._doc.bookedby,
    ]);
  });

  const colWidths = [5, 15, 15, 12, 25, 50, 15, 15, 15, 50];
  const tableHeading = "LIST OF ATTENDEES";
  const exportFilename = "ListOthersAttendees.xlsx";
  //shortened exporting to Excel - 20-Jan-21 --> Nice job!

  // exportToExcel(colHeadings, colWidths, newList, tableHeading, exportFilename); //This auto-emails --> to be fixed: 19-Nov-21

  return list;
}; //exportGenSkedList
