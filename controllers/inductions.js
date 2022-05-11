const appLogger = require("./logger"); //using winston --> added: 04-Dec-21

const { body, validationResult } = require("express-validator/check");
const { sanitizeBody } = require("express-validator/filter");
const dotenv = require("dotenv");
const async = require("async");
const moment = require("moment");

const Sked = require("../models/sked");
const User = require("../models/user");
const fs = require("fs");
const sharp = require("sharp");
const mongoose = require("mongoose");

// console.log("mongoose object >>", mongoose);

const Jimp = require("jimp");

const {
  sendHtmlMail,
  sendMail,
  getSettings,
  getSkeds,
  getBooking,
  cropImage,
} = require("../helpers/gaglib"); //Own lib added: 19-Jan-21

const { export2Excel } = require("../helpers/excelExport"); //added: 30-Nov-21

dotenv.load(); //load environment variables

const uri =
  process.env.DEVELOPMENT == "1"
    ? "mongodb://127.0.0.1:27017"
    : process.env.MONGODB_URI;
// console.log("URI: ", uri);

// useNewUrlParser: true;
// useUnifiedTopology: true;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

const connection = mongoose.connection;
// console.log("CONNECTION:", connection);

// console.log("mongoose object >>", mongoose);

const package = require("../package.json");
//console.log(package.version);

//router.get("/db_inductions", inductions.db_inductions);
exports.db_inductions = function (req, res) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  getBookingSked(req, res); //uses async/await
};

const getBookingSked = async (req, res) => {
  let arrSkeds = [];
  let tit_sess1 = [];
  let tit_sess2 = [];
  let aIsNew = [];
  let aTitleColor = [];
  let arrBooking = [];

  const settings = await getSettings();

  arrSkeds = await getSkeds(parseInt(process.env.NUMDAYS)); //make this as flexible via environment variables

  for (let i = 0; i < arrSkeds.length; i++) {
    let booking1 = await getBooking(arrSkeds[i], "1");
    let booking2 = await getBooking(arrSkeds[i], "2");
    let noSecondSession = false;

    booking_date = arrSkeds[i];

    noSecondSession =
      booking_date >= settings[0].start_no_second_session &&
      booking_date <= settings[0].end_no_second_session;

    //booking_num1 = parseInt(process.env.NUMPAX) - booking1;
    booking_num1 = settings[0].max_pax - booking1;
    booking_num2 = noSecondSession ? 0 : settings[0].max_pax - booking2;

    aIsNew.push(
      moment(arrSkeds[i], "YYYY-MM-DD") >=
        moment(process.env.START_SESSION_IMPLEMENT, "YYYY-MM-DD")
        ? true
        : false
    );
    aTitleColor.push(
      moment(arrSkeds[i], "YYYY-MM-DD") >=
        moment(process.env.START_SESSION_IMPLEMENT, "YYYY-MM-DD")
        ? "text-center text-white"
        : "text-center text-warning"
    );

    tit_sess1.push(
      aIsNew[i]
        ? process.env.NEW_TITLE_SESSION1
        : process.env.OLD_TITLE_SESSION1
    );
    tit_sess2.push(
      aIsNew[i]
        ? process.env.NEW_TITLE_SESSION2
        : process.env.OLD_TITLE_SESSION2
    );

    arrBooking.push({
      booking_date,
      booking_num1,
      booking_num2,
    });
  }

  // console.log("arrBooking", arrBooking);
  // console.log("tit_sess1", tit_sess1);

  res.render("db_inductions", {
    avail_date: arrBooking,
    userlevel: req.session.level,
    version: package.version,
    title_session1: tit_sess1,
    title_session2: tit_sess2,
    username: req.session.username,
    email: req.session.email,
    settings,
    userLevel: req.session.level,
    version: package.version,
  });
};

const prepSiteSafeImages = async (fileList) => {
  fileList.forEach(async (file) => {
    appLogger.info("SS Photo URL: " + file.ssUrl + file.ss_photo_filename);
    // console.log(file.ssUrl, file.ss_photo_filename);
    cropImage(file.ssUrl, file.ss_photo_filename, 200, 200);
  });
};

const prepHeadShotImages = async (fileList) => {
  fileList.forEach(async (file) => {
    appLogger.info("Headshot photo URL: " + file.headUrl + file.headshot);
    // console.log(file.headUrl, file.headshot);

    cropImage(file.headUrl, file.headshot, 200, 200);
  });
};

//router.get("/sked/create", inductions.sked_create_get);
exports.sked_create_get = function (req, res, next) {
  dateval = Object.values(req.query);
  // console.log("dateval=", dateval);

  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  const dateToday = new Date();
  const dateTodayString = moment(dateToday).format("YYYY-MM-DD");
  const timeNow = moment(dateToday).format("HH");
  const isExpired =
    dateTodayString === dateval[0] && parseInt(timeNow) > 8 ? 1 : 0; //added: 04-Feb-19

  //Following codes were added: 18-Feb-19 --> this is to ensure that once a user clicks on book now, a new record shall be created immediately.
  //This trick of auto-adding a record is to ensure that total available slots are updated immediately. However if user cancels such record will be deleted.
  //Deleting is done every time the system is routed to /home.

  var today = new Date();
  let totrec = 0;

  //added the following: 04-Aug-20 to let System check if indeed there is still available slot. This is a CA for some incidents whereby the number of attendees go beyond maximum of 30-pax
  async.parallel(
    {
      totrec: function (callback) {
        Sked.countDocuments({ date_attend: { $eq: dateval[0] } }, callback); // Pass an empty object as match condition to find all documents of this collection
      },
    },
    function (err, results) {
      appLogger.info(`total count: ${results.totrec}`);
      // console.log(`total count: ${results.totrec}`);
    }
  );

  if (totrec < 30) {
    var sked = new Sked({
      lastname: "lastname",
      firstname: "firstname",
      company: "company",
      phone: "phone",
      sitesafe: "123456",
      constructsafe: "",
      ss_photo_filename: "",
      headshot: "",
      fcc_supervisor: "",
      workpack: "",
      company_supervisor: "",
      first_tier: "",
      expiry: today,
      session: dateval[1],
      session_title: dateval[2],
      date_attend: dateval[0],
      bookdate: new Date(),
      bookedby: req.session.username + " / " + req.session.email,
      emergency_person: "emergency contact person",
      emergency_phone: "emergency contact number",
      userid: req.session.userId,
      train_type: 1, // 1=Induction Booking, 2=Other trainings --> Added: 11-Oct-20 due to addition of Other Trainings as per request from Erika/Vanessa
    });
    sked.save(function (err, objid) {
      if (err) {
        return next(err);
      }
      //console.log(objid._id);
      res.redirect(
        "/sked/fillup/" +
          "?" +
          "data1=" +
          dateval[0] +
          "&" +
          "data2=" +
          dateval[1] +
          "&" +
          "data3=" +
          objid._id +
          "&" +
          "data4=" +
          dateval[2]
      );
    });
  } else {
    res.render("fullybooked");
  }
}; //exports.sked_create_get

//router.get("/sked/fillup", inductions.sked_display_get);
exports.sked_display_get = async function (req, res, next) {
  try {
    const settings = await getSettings();
    dateval = Object.values(req.query);

    if (!req.session.userId) {
      var err = new Error("Not authorized! Go back!");
      err.status = 400;
      return res.redirect("/logout");
    }

    const dateToday = new Date();
    const dateTodayString = moment(dateToday).format("YYYY-MM-DD");
    const timeNow = moment(dateToday).format("HH");
    const isExpired =
      dateTodayString === dateval[0] && parseInt(timeNow) > 8 ? 1 : 0; //added: 04-Feb-19

    //Following codes were added: 18-Feb-19 --> this is to ensure that once a user clicks on book now, a new record shall be created immediately
    //- however if he cancels such record will be deleted

    // console.log(settings);
    // appLogger.info(`dateTodayString: ${dateTodayString}`); //use this now instead of console.log() --> 14-Dec-21
    // appLogger.info(`parseInt(timeNow): ${parseInt(timeNow)}`);
    // console.log("dateTodayString:", dateTodayString);
    // console.log("parseInt(timeNow):", parseInt(timeNow));

    // console.log("Board Setting: ", settings[0].board_msg);

    res.render("booking", {
      datenow: dateval,
      user: req.session.company,
      userlevel: req.session.level,
      isexpired: 0,
      obj_id: dateval[2],
      skedtit: dateval[3],
      company_type: req.session.company_type,
      runstage: process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
      username: req.session.username,
      email: req.session.email,
      version: package.version,
      settings,
    });
  } catch (err) {
    appLogger.error(err);
    throw err;
  }
}; //exports.sked_display_get

// Handle create new booking on POST.
//router.post("/sked/create", inductions.sked_create_post);
exports.sked_create_post = [
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
  async (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      var err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }
    // console.log(req);
    // shrink image before uploading to MongoDb --> 21-Nov-21
    // files here is coming from the middleware --> 21-Nov-21
    var allowedExtensions = /(\.jpg|\.jpeg|\.png|\.gif)$/i;
    if (
      !allowedExtensions.exec(req.files["ss_photo"][0].originalname) ||
      !allowedExtensions.exec(req.files["headshot"][0].originalname)
    ) {
      appLogger.error(
        `Either of these attachments are invalid: ${req.files["ss_photo"][0].originalname} or ${req.files["headshot"][0].originalname}`
      );
      res.status(500).send("Invalid data");
    }

    const fname_ss =
      "./uploads_img/" +
      req.body.obj_id +
      "_" +
      req.files["ss_photo"][0].originalname.toLowerCase().replace(/\s+/g, ""); //changed: 18-Feb-22

    try {
      await sharp(req.files["ss_photo"][0].buffer, { failOnError: false })
        .resize(600, 600, {
          fit: sharp.fit.inside,
          withoutEnlargement: true, // if image's original width or height is less than specified width and height, sharp will do nothing(i.e no enlargement)
        })
        .toFile(fname_ss);
    } catch (error) {
      throw error;
    }

    // shrink image before uploading to MongoDb --> 21-Nov-21
    const fname_hs =
      "./uploads_img/" +
      req.body.obj_id +
      "_" +
      req.files["headshot"][0].originalname.toLowerCase().replace(/\s+/g, ""); //changed: 17-Feb-22

    try {
      await sharp(req.files["headshot"][0].buffer, { failOnError: false })
        .resize(600, 600, {
          fit: sharp.fit.inside,
          withoutEnlargement: true, // if image's original width or height is less than specified width and height, sharp will do nothing(i.e no enlargement)
        })
        .toFile(fname_hs);
    } catch (error) {
      throw error;
    }

    let ext_hs = "";
    let ext_ss = "";
    let ext = "";

    let firstDot = fname_hs.indexOf(".");

    ext_hs = fname_hs.slice(fname_hs.indexOf(".", firstDot + 1) + 1);
    // console.log(`extension headshot: ${ext_hs}`);
    const content_type_hs =
      ext_hs == "jpg" || ext_hs == "jpeg" ? "image/jpeg" : "image/png";
    // console.log(content_type_hs);

    firstDot = fname_ss.indexOf(".");

    ext_ss = fname_ss.slice(fname_ss.indexOf(".", firstDot + 1) + 1);
    // console.log(`extension ss: ${ext_ss}`);
    const content_type_ss =
      ext_ss == "jpg" || ext_ss == "jpeg" ? "image/jpeg" : "image/png";
    // console.log(content_type_ss);

    // const mongo = new mongoose.mongo();
    // console.log("mongo", mongo);

    let gridfsbucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      chunkSizeBytes: 1024,
      bucketName: "docs",
    });

    fs.createReadStream(fname_hs)
      .pipe(gridfsbucket.openUploadStream(fname_hs.slice(14)))
      .on("error", () => {
        console.log("Some error occured:" + error);
        res.send(error);
      })
      .on("finish", () => {
        console.log("done uploading headshot");
        //process.exit(0);
        // res.send("Done Uploading");
      });

    fs.createReadStream(fname_ss)
      .pipe(gridfsbucket.openUploadStream(fname_ss.slice(14)))
      .on("error", () => {
        console.log("Some error occured:" + error);
        res.send(error);
      })
      .on("finish", () => {
        console.log("done uploading site safe");
        //process.exit(0);
        // res.send("Done Uploading");
      });

    const dateval = Object.values(req.query);

    //18-Feb-2019: Following codes were modified to suit the logic of updating the contents of the current booking once the user presses Submit button in the booking form
    Sked.find({ _id: { $eq: req.body.obj_id } }).exec(function (err, sked) {
      if (err) {
        return next(err);
      }

      if (JSON.stringify(sked) !== "[]") {
        var today = new Date();

        var newsked = new Sked({
          lastname: req.body.lastname.toUpperCase(),
          firstname: req.body.firstname.toUpperCase(),
          phone: req.body.phone,
          company: req.body.company.toUpperCase(),
          sitesafe: req.body.sitesafe,
          constructsafe: req.body.constructsafe,
          expiry: req.body.expiry,
          fcc_supervisor: req.body.fcc_supervisor.toUpperCase(),
          workpack: req.body.workpack,
          company_supervisor: req.body.company_supervisor.toUpperCase(),
          first_tier: req.body.first_tier,
          session: req.body.data_sked,
          ss_photo_filename: fname_ss.slice(14), //changed: 17-Feb-22
          headshot: fname_hs.slice(14), //changed: 17-Feb-22
          session_title: req.body.data_tit,
          date_attend: req.body.data_date,
          bookdate: new Date(),
          bookedby:
            req.session.username.toUpperCase() +
            " / " +
            req.session.email.toLowerCase(),
          userid: req.session.userId,
          emergency_person: req.body.emergency_person.toUpperCase(),
          emergency_phone: req.body.emergency_phone,
          vaccine_confirmed_by:
            req.session.username.toUpperCase() +
            " / " +
            req.session.email.toLowerCase(), //added: 26-Feb-22
          _id: req.body.obj_id,
        });

        Sked.findByIdAndUpdate(
          req.body.obj_id,
          newsked,
          {},
          function (err, thebooking) {
            if (err) {
              return next(err);
            }
            // recvr = [req.session.email, "inductbook@gmail.com"]; //email the one who booked this (currently logged-in)
            recvr = [req.session.email]; //email the one who booked this (currently logged-in)
            (subject =
              "New Booking: " + newsked.firstname + " " + newsked.lastname),
              (emailbody =
                "             Booking No.: " +
                newsked.id +
                "\r\n" +
                "                    Name: " +
                newsked.firstname +
                " " +
                newsked.lastname +
                "\r\n" +
                "                   Phone: " +
                newsked.phone +
                "\r\n" +
                "                 Company: " +
                newsked.company +
                "\r\n" +
                "             Where to go: NodeSafe Site Office, Te Atatu South" +
                "\r\n" +
                "           Site Safe No.: " +
                newsked.sitesafe +
                " / SS Expiry: " +
                moment(newsked.expiry).format("DD-MMM-YYYY") +
                "\r\n" +
                "                 Booking: " +
                moment(newsked.date_attend).format("DD-MMM-YYYY") +
                " / Session: " +
                newsked.session_title +
                "\r\n" +
                "Emergency contact person: " +
                newsked.emergency_person +
                "\r\n" +
                "Emergency contact number: " +
                newsked.emergency_phone +
                "\r\n");

            emaildata = {
              booking_num: newsked.id,
              name: newsked.firstname + " " + newsked.lastname,
              phone: newsked.phone,
              company: newsked.company,
              // where:
              //   "Fletcher new Site Office, Ground Floor, 210 Federal St, Auckland",
              where:
                "WorkSite Induction Office, 1234 Site Office Address, Auckland",
              sitesafe:
                newsked.sitesafe +
                " / SS Expiry " +
                moment(newsked.expiry).format("DD-MMM-YYYY"),
              booking:
                moment(newsked.date_attend).format("DD-MMM-YYYY") +
                " / Session: " +
                newsked.session_title,
              e_person: newsked.emergency_person,
              e_number: newsked.emergency_phone,
              fcc_supervisor: newsked.fcc_supervisor,
              workpack: newsked.workpack,
              company_supervisor: newsked.company_supervisor,
              first_tier: newsked.first_tier,
              constructsafe: newsked.constructsafe,
            };
            //sendMail(recvr,subject,emailbody); //located at the top of this file
            sendHtmlMail(
              recvr,
              subject,
              emaildata,
              "Induction Requirements.pdf",
              true
            ); //located at the top of this file
            req.flash("success", `Confirmation email sent to: ${recvr}`);
            //res.redirect("/home");
            res.redirect("/db_inductions"); //updated: 28-Jan-21 due to changes in the UI design
          }
        ); //Sked.findByIdAndUpdate
      } else {
        // console.log("SESSION EXPIRED!");
        appLogger.error("SESSION EXPIRED!");
        errmsg = "DATA not saved - session expired";
        res.render("booking", {
          datenow: dateval,
          user: req.session.company,
          userlevel: req.session.level,
          isexpired: 1,
          obj_id: dateval[2],
          company_type: req.session.company_type,
          runstage:
            process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
          username: req.session.username,
          email: req.session.email,
        });
      } //else
    }); //exec
  }, //(req,res,next)
]; //sked_create_post

// Route to delete a booking - but this one used by the Cancel button in the Booking screen
//router.get("/sked/delete/:id", inductions.sked_delete_get);
exports.sked_delete_get = function (req, res, next) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  Sked.findByIdAndRemove(req.params.id, function cancelBook(err) {
    if (err) {
      // console.log("Booking expired");
      appLogger.error("Booking expired");

      // return next(err);
    }
    res.redirect("/home");
  });
}; //exports.sked_delete_get

// Route to display the screen for the update the booking (get). This is triggered when the 'edit' button is pressed in the list of induction attendees from the "/print" route
//router.get("/booking/:id", inductions.booking_update_get);
exports.booking_update_get = function (req, res, next) {
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
    res.render("booking_update", {
      booking_data: booking,
      sked_id: req.params.id,
      userlevel: req.session.level,
      dexpiry: moment(booking.expiry).format("YYYY-MM-DD"),
      username: req.session.username,
      email: req.session.email,
      version: package.version,
    });
  });
};

//Book_Update --> 20-Apr-22
exports.book_update_post = [
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
  sanitizeBody("company").trim().escape(),
  sanitizeBody("sitesafe").trim().escape(),
  sanitizeBody("emergency_person").trim().escape(),
  sanitizeBody("emergency_number").trim().escape(),
  sanitizeBody("expiry").toDate(),

  // Process request after validation and sanitization.
  async (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      var err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }

    let withSSPhoto = false;
    let withHSPhoto = false;
    let fname_ss = "";
    let fname_hs = "";

    if ("ss_photo" in req.files) {
      // console.log("Has a Site Safe Photo!");
      var allowedExtensions = /(\.jpg|\.jpeg|\.png|\.gif)$/i;
      if (!allowedExtensions.exec(req.files["ss_photo"][0].originalname)) {
        appLogger.error(
          `Site Safe Photo attachment invalid: ${req.files["ss_photo"][0].originalname}`
        );
        res.status(500).send("Invalid data");
      }

      fname_ss =
        "./uploads_img/" +
        req.body.booking_id +
        "_" +
        req.files["ss_photo"][0].originalname.toLowerCase().replace(/\s+/g, ""); //changed: 18-Feb-22

      try {
        await sharp(req.files["ss_photo"][0].buffer, { failOnError: false })
          .resize(600, 600, {
            fit: sharp.fit.inside,
            withoutEnlargement: true, // if image's original width or height is less than specified width and height, sharp will do nothing(i.e no enlargement)
          })
          .toFile(fname_ss);
      } catch (error) {
        throw error;
      }

      let ext_ss = "";
      let ext = "";

      firstDot = fname_ss.indexOf(".");

      ext_ss = fname_ss.slice(fname_ss.indexOf(".", firstDot + 1) + 1);
      // console.log(`extension ss: ${ext_ss}`);
      const content_type_ss =
        ext_ss == "jpg" || ext_ss == "jpeg" ? "image/jpeg" : "image/png";
      // console.log(content_type_ss);

      let gridfsbucket = new mongoose.mongo.GridFSBucket(
        mongoose.connection.db,
        {
          chunkSizeBytes: 1024,
          bucketName: "docs",
        }
      );

      fs.createReadStream(fname_ss)
        .pipe(gridfsbucket.openUploadStream(fname_ss.slice(14)))
        .on("error", () => {
          console.log("Some error occured:" + error);
          res.send(error);
        })
        .on("finish", () => {
          console.log("done uploading site safe");
        });
      withSSPhoto = true;
    } else {
      console.log("No changes made on the SiteSafe photo...");
    }

    if ("headshot" in req.files) {
      // console.log("Has a Headshot Photo!");
      var allowedExtensions = /(\.jpg|\.jpeg|\.png|\.gif)$/i;
      if (!allowedExtensions.exec(req.files["headshot"][0].originalname)) {
        appLogger.error(
          `Headshot photo invalid: ${req.files["headshot"][0].originalname}`
        );
        res.status(500).send("Invalid data");
      }

      fname_hs =
        "./uploads_img/" +
        req.body.booking_id +
        "_" +
        req.files["headshot"][0].originalname.toLowerCase().replace(/\s+/g, ""); //changed: 17-Feb-22

      try {
        await sharp(req.files["headshot"][0].buffer, { failOnError: false })
          .resize(600, 600, {
            fit: sharp.fit.inside,
            withoutEnlargement: true, // if image's original width or height is less than specified width and height, sharp will do nothing(i.e no enlargement)
          })
          .toFile(fname_hs);
      } catch (error) {
        throw error;
      }

      let ext_hs = "";
      let ext = "";

      let firstDot = fname_hs.indexOf(".");

      ext_hs = fname_hs.slice(fname_hs.indexOf(".", firstDot + 1) + 1);
      // console.log(`extension headshot: ${ext_hs}`);
      const content_type_hs =
        ext_hs == "jpg" || ext_hs == "jpeg" ? "image/jpeg" : "image/png";
      // console.log(content_type_hs);

      let gridfsbucket = new mongoose.mongo.GridFSBucket(
        mongoose.connection.db,
        {
          chunkSizeBytes: 1024,
          bucketName: "docs",
        }
      );

      fs.createReadStream(fname_hs)
        .pipe(gridfsbucket.openUploadStream(fname_hs.slice(14)))
        .on("error", () => {
          console.log("Some error occured:" + error);
          res.send(error);
        })
        .on("finish", () => {
          console.log("done uploading headshot");
        });

      withHSPhoto = true;
    } else {
      console.log("No changes made on the headshot photo...");
    }

    // console.log("fname_ss", fname_ss);
    // console.log("fname_hs", fname_hs);

    const sked = new Sked({
      lastname: req.body.lastname.toUpperCase(),
      firstname: req.body.firstname.toUpperCase(),
      phone: req.body.phone,
      company: req.body.company.toUpperCase(),
      sitesafe: req.body.sitesafe,
      constructsafe: req.body.constructsafe,
      expiry: req.body.expiry,
      fcc_supervisor: req.body.fcc_supervisor.toUpperCase(),
      workpack: req.body.workpack,
      company_supervisor: req.body.company_supervisor.toUpperCase(),
      first_tier: req.body.first_tier,
      session: req.body.data_sked,
      ss_photo_filename: withSSPhoto ? fname_ss.slice(14) : req.body.orig_ss, //changed: 20-Apr-22
      headshot: withHSPhoto ? fname_hs.slice(14) : req.body.orig_hs, //changed: 20-Apr-22
      session_title: req.body.data_tit,
      date_attend: req.body.data_date,
      bookdate: new Date(),
      bookedby:
        req.session.username.toUpperCase() +
        " / " +
        req.session.email.toLowerCase(),
      userid: req.session.userId,
      emergency_person: req.body.emergency_person.toUpperCase(),
      emergency_phone: req.body.emergency_phone,
      _id: req.body.booking_id,
    });

    // Sked.findByIdAndUpdate(req.params.id, sked, {}, function (err, theptw) {
    Sked.findByIdAndUpdate(
      req.body.booking_id,
      sked,
      {},
      function (err, theptw) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        //res.redirect("/list_booking");
        res.redirect("/print"); //used this route now since this now includes Edit and Delete button per record: 14-Oct-20
      }
    );
  },
];

// Route to update the booking (post). This is triggered when the 'edit' button is pressed in the list of induction attendees from the "/print" route
// router.post("/booking/:id", inductions.booking_update_post);
exports.booking_update_post = [
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
  sanitizeBody("company").trim().escape(),
  sanitizeBody("sitesafe").trim().escape(),
  sanitizeBody("emergency_person").trim().escape(),
  sanitizeBody("emergency_number").trim().escape(),
  sanitizeBody("expiry").toDate(),

  // Process request after validation and sanitization.
  async (req, res, next) => {
    //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
    if (!req.session.userId) {
      var err = new Error("Not authorized! Go back!");
      err.status = 400;
      //return next(err);
      return res.redirect("/logout");
    }
    // ss_photo_filename: req.files["ss_photo"][0].filename.toLowerCase(),
    // headshot: req.files["headshot"][0].filename.toLowerCase(),

    // shrink image before uploading to MongoDb --> 21-Nov-21
    // files here is coming from the middleware --> 21-Nov-21
    // console.log("req", req.body);
    var allowedExtensions = /(\.jpg|\.jpeg|\.png|\.gif)$/i;
    // if (
    //   !allowedExtensions.exec(req.files["ss_photo"][0].originalname) ||
    //   !allowedExtensions.exec(req.files["headshot"][0].originalname)
    // ) {
    //   appLogger.error(
    //     `Either of these attachments are invalid: ${req.files["ss_photo"][0].originalname} or ${req.files["headshot"][0].originalname}`
    //   );
    //   res.status(500).send("Invalid data");
    // }

    // const fname_ss =
    //   "./uploads_img/" +
    //   req.body.obj_id +
    //   "_" +
    //   req.files["ss_photo"][0].originalname.toLowerCase().replace(/\s+/g, ""); //changed: 18-Feb-22

    // try {
    //   await sharp(req.files["ss_photo"][0].buffer, { failOnError: false })
    //     .resize(600, 600, {
    //       fit: sharp.fit.inside,
    //       withoutEnlargement: true, // if image's original width or height is less than specified width and height, sharp will do nothing(i.e no enlargement)
    //     })
    //     .toFile(fname_ss);
    // } catch (error) {
    //   throw error;
    // }

    // // shrink image before uploading to MongoDb --> 21-Nov-21
    // const fname_hs =
    //   "./uploads_img/" +
    //   req.body.obj_id +
    //   "_" +
    //   req.files["headshot"][0].originalname.toLowerCase().replace(/\s+/g, ""); //changed: 17-Feb-22

    // try {
    //   await sharp(req.files["headshot"][0].buffer, { failOnError: false })
    //     .resize(600, 600, {
    //       fit: sharp.fit.inside,
    //       withoutEnlargement: true, // if image's original width or height is less than specified width and height, sharp will do nothing(i.e no enlargement)
    //     })
    //     .toFile(fname_hs);
    // } catch (error) {
    //   throw error;
    // }

    // let ext_hs = "";
    // let ext_ss = "";
    // let ext = "";

    // let firstDot = fname_hs.indexOf(".");

    // ext_hs = fname_hs.slice(fname_hs.indexOf(".", firstDot + 1) + 1);
    // console.log(`extension headshot: ${ext_hs}`);
    // const content_type_hs =
    //   ext_hs == "jpg" || ext_hs == "jpeg" ? "image/jpeg" : "image/png";
    // console.log(content_type_hs);

    // firstDot = fname_ss.indexOf(".");

    // ext_ss = fname_ss.slice(fname_ss.indexOf(".", firstDot + 1) + 1);
    // console.log(`extension ss: ${ext_ss}`);
    // const content_type_ss =
    //   ext_ss == "jpg" || ext_ss == "jpeg" ? "image/jpeg" : "image/png";
    // console.log(content_type_ss);

    // // const mongo = new mongoose.mongo();
    // // console.log("mongo", mongo);

    // let gridfsbucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    //   chunkSizeBytes: 1024,
    //   bucketName: "docs",
    // });

    // fs.createReadStream(fname_hs)
    //   .pipe(gridfsbucket.openUploadStream(fname_hs.slice(14)))
    //   .on("error", () => {
    //     console.log("Some error occured:" + error);
    //     res.send(error);
    //   })
    //   .on("finish", () => {
    //     console.log("done uploading headshot");
    //     //process.exit(0);
    //     // res.send("Done Uploading");
    //   });

    // fs.createReadStream(fname_ss)
    //   .pipe(gridfsbucket.openUploadStream(fname_ss.slice(14)))
    //   .on("error", () => {
    //     console.log("Some error occured:" + error);
    //     res.send(error);
    //   })
    //   .on("finish", () => {
    //     console.log("done uploading site safe");
    //     //process.exit(0);
    //     // res.send("Done Uploading");
    //   });

    const sked = new Sked({
      lastname: req.body.lastname.toUpperCase(),
      firstname: req.body.firstname.toUpperCase(),
      phone: req.body.phone,
      company: req.body.company.toUpperCase(),
      sitesafe: req.body.sitesafe,
      constructsafe: req.body.constructsafe,
      expiry: req.body.expiry,
      fcc_supervisor: req.body.fcc_supervisor.toUpperCase(),
      workpack: req.body.workpack,
      company_supervisor: req.body.company_supervisor.toUpperCase(),
      first_tier: req.body.first_tier,
      session: req.body.data_sked,
      // ss_photo_filename: fname_ss.slice(14), //changed: 17-Feb-22
      // headshot: fname_hs.slice(14), //changed: 17-Feb-22
      session_title: req.body.data_tit,
      date_attend: req.body.data_date,
      bookdate: new Date(),
      bookedby:
        req.session.username.toUpperCase() +
        " / " +
        req.session.email.toLowerCase(),
      userid: req.session.userId,
      emergency_person: req.body.emergency_person.toUpperCase(),
      emergency_phone: req.body.emergency_phone,
      _id: req.params.id,
    });

    Sked.findByIdAndUpdate(req.params.id, sked, {}, function (err, theptw) {
      if (err) {
        return next(err);
      }
      // Successful - redirect to new record.
      //res.redirect("/list_booking");
      res.redirect("/print"); //used this route now since this now includes Edit and Delete button per record: 14-Oct-20
    });
  },
];

// Route to delete a booking. Access is based on security level. Admin can delete any booking. Users can only delete their own booking.
// This is used by the Delete button inside the '/print' route where all bookings are listed down
// router.get("/booking/delete/:id", inductions.book_delete_get);
exports.book_delete_get = function (req, res, next) {
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
    res.redirect("/print");
  });
};

// This is the route to email ListAttendees.xlsx to all the 'admin'
// router.get("/email", inductions.email_export_get);
exports.email_export_get = (req, res) => {
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

    var emails = [];

    admins.forEach((admin) => {
      emails.push(admin.email);
    });

    // emails = ["gagabon@safenode.co.nz"]; //remove after test

    subject = "List of Attendees for EHS Induction";
    emailbody = "see attachment";
    sendMail(emails, subject, emailbody, "ListAttendees.xlsx"); //located at the top of this file
    req.flash("success", "Email successfully sent...");
    res.redirect(prevPage); //wow! this actually works! --> 19-Jul-20 @Auckland NZ --> the intent is that after the "Email" button was pressed, the system will just go and show the previous page
  });
};

// Route to show the image uploaded during induction booking. This route is also used in the downloading of images and then cropping those images for use in
// the preparation of the Excel file - ListAttendees.xlsx
// router.get("/image/:filename", inductions.show_img_get);
exports.show_img_get = (req, res) => {
  let gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    chunkSizeBytes: 1024,
    bucketName: "docs",
  });

  const readstream = gridFSBucket.openDownloadStreamByName(req.params.filename);
  readstream.pipe(res);
};

//Used by Export2Excel button in export_list.ejs --> 05-Nov-21
exports.get_list_inductions = async (req, res) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;

    return res.redirect("/logout");
  }
  const today = new Date();
  let md = moment(today).format("YYYY-MM-DD");
  let dateval = Object.values(req.query);
  let dateval1 = [];
  // console.log("dateval: ", dateval);
  dateval1[0] = dateval[0] === undefined ? md : dateval[0];
  dateval1[1] = dateval[1] === undefined ? md : dateval[1];
  // console.log("dateval1: ", dateval1);
  export2Excel(dateval); //in excelExport.js --> helpers folder --> 30-Nov-21

  req.flash("success", "List of induction attendees emailed");
  // res.redirect(`/print/?data1=${dateval1[0]}&data2=${dateval1[1]}`);
  res.redirect("/print");
};

// This route displays the list of induction attendees - this is the main screen. User can filter the list, generate an Excel file, download the
// Excel file, or email the file to all the 'admin'
// router.get("/print", inductions.list_export_get);
exports.list_export_get = async (req, res) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;

    return res.redirect("/logout");
  }
  const today = new Date();
  let md = moment(today).format("YYYY-MM-DD");
  const dateval = Object.values(req.query);

  const dfrom =
    dateval[0] === undefined ? md : moment(dateval[0]).format("YYYY-MM-DD");
  const dto =
    dateval[1] === undefined ? md : moment(dateval[1]).format("YYYY-MM-DD");

  const date_from = dfrom;
  const date_to = dto;
  const showAll = dateval[0] === undefined ? true : false;
  const protocol = req.headers.referer.substring(
    0,
    req.headers.referer.indexOf(":")
  ); //just to get the http or https part of the url
  // console.log("protocol: ", protocol);
  // console.log("req.headers.host", req.headers.host);

  const list_users = await getInductionList(
    dateval,
    req.session.level,
    req.session.userId
  );

  let newList = [];
  let ssUrl = "";
  let headUrl = "";
  let tmpObj = {};
  let regex = /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i; //regex to validate images --> 14-Nov-21
  let ss = "";
  let hs = "";
  const bareUrl = protocol + "://" + req.headers.host;

  list_users.forEach((user) => {
    ss = regex.test(user._doc.ss_photo_filename) ? "/image/" : "/download/";
    hs = regex.test(user._doc.headshot) ? "/image/" : "/download/";
    ssUrl = bareUrl + ss + user._doc.ss_photo_filename;
    headUrl = bareUrl + hs + user._doc.headshot;

    tmpObj = { ...user._doc, ssUrl, headUrl }; //copy each user object then add the new properties ssUrl and headUrl --> 14-Nov-21
    newList.push(tmpObj); //push the new object to the newList array of objects --> 14-Nov-21
  });

  res.render("export_list", {
    files: newList,
    datenow: moment(today).format("dddd Do MMM YYYY"),
    dfrom: date_from,
    dto: date_to,
    level: req.session.level,
    username: req.session.username,
    userlevel: req.session.level,
    showall: showAll,
    company_type: req.session.company_type,
    runstage: process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
    email: req.session.email,
    flash_msg: req.flash("success"),
    version: package.version,
  });
};

//route to download the ListAttendees.xlsx file generated by the "/generate" route
//router.get("/download", inductions.download_export_get);
exports.download_export_get = async (req, res) => {
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }
  if (fs.existsSync("./ListAttendees.xlsx")) {
    // req.flash("success", "File downloaded"); //this does not work since there is no redirect() --> 14-Nov-21
    res.download("./ListAttendees.xlsx", function (err) {
      // console.log(err);
    });
  } else {
    console.log("File not ready yet...");
    req.flash("error", "File not ready yet. Please click the Generate button");
    res.redirect("/print");
  }
};

//Function to get the list of induction attendees as displayed in the "/print" route. This function also facilitates the downloading of images and
//the cropping of those images for use in the display in the "/print" route as well as the cropped images for use in the ListAttendees.xlsx file
const exportInductions = async (dateval, userLevel, userId, url, bareUrl) => {
  try {
    const list_users = await getInductionList(dateval, userLevel, userId);
    return newList; //return the newList
  } catch (error) {
    throw error;
  }
}; //exportInductions

//Function to retrieve induction attendees based on the parameter "From Date" and "To Date" from the collection "Sked"
//This is a promised-based function. This returns the list of attendees
const getInductionList = (dateval, userLevel, userId) => {
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
          { train_type: { $eq: 1 } },
          userLevel < 2 ? { userid: { $eq: userId } } : {},
        ],
      })
        .select(
          "firstname lastname phone company sitesafe expiry date_attend session session_title bookdate bookedby emergency_person emergency_phone ss_photo_filename headshot fcc_supervisor workpack  company_supervisor first_tier constructsafe vaccine_confirmed_by"
        )
        .sort({ date_attend: 1, session: 1 })
    );
  });
};
