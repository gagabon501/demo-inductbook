const express = require("express");
const router = express.Router();

const package = require("../package.json"); //added: 13-Mar-22

const appLogger = require("../controllers/logger"); //using winston --> added: 04-Dec-21

const CronJob = require("cron").CronJob;
const Sked = require("../models/sked");

const moment = require("moment");

const logins = require("../controllers/logins");
const users = require("../controllers/users");
const home = require("../controllers/home");
const inductions = require("../controllers/inductions");
const trainings = require("../controllers/trainings");
const genskeds = require("../controllers/genskeds");
const holidays = require("../controllers/holidays");
const settings = require("../controllers/settings");
const dashboard = require("../controllers/dashboard");
const chats = require("../controllers/chat");
const loginmonitor = require("../controllers/loginmonitor");
const livebooking = require("../controllers/livebooking");
const billing = require("../controllers/billing");
const logfile = require("../controllers/logfile");

const { sendList, doCleanUp } = require("../helpers/cronjobs");
const { sendMail } = require("../helpers/gaglib"); //sendMail: async (recvr, subject, emailbody, fileAttachment, path)

const getInductionList = (dateval, userLevel, userId) => {
  return new Promise((resolve, reject) => {
    resolve(
      Sked.find(
        {
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
        },
        { _id: 0 }
      )
        .select(
          "firstname lastname phone company sitesafe expiry date_attend session session_title bookdate bookedby emergency_person emergency_phone ss_photo_filename headshot fcc_supervisor workpack  company_supervisor first_tier constructsafe"
        )
        .sort({ date_attend: 1, session: 1 })
    );
  });
};

const cleanUp = new CronJob(
  "* * * * *",
  doCleanUp,
  null,
  true,
  "Pacific/Auckland"
);

cleanUp.start(); //every minute

//"15 15 * * 1-4",
//runs daily now --> 04-Dec-21
const job = new CronJob(
  "15 15 * * 0-6",
  function () {
    // console.log("Running cron job for Monday to Thursday...");
    let today = new Date();
    let tomorrow = today;
    tomorrow = today.setDate(today.getDate() + 1);
    console.log(moment(tomorrow).format("YYYY-MM-DD"));
    // appLogger.info(
    //   `Running cron job daily and fetching attendees for: ${moment(
    //     tomorrow
    //   ).format("YYYY-MM-DD")}`
    // );
    sendList(
      moment(tomorrow).format("YYYY-MM-DD"),
      moment(tomorrow).format("YYYY-MM-DD"),
      4,
      "5c0b207cb024d224ee71750e"
    );

    //ptw_controller.sendlist_get(); //this will list all attendees for the following day and onwards
  },
  null,
  true,
  "Pacific/Auckland"
);

job.start(); //now runs everyday --> 4-Dec-21

const mailJob = new CronJob(
  "01 16 * * 0-6",
  function () {
    appLogger.info(`Daily emailing logfiles`);
    const recvr = "gagabon@safenode.co.nz";
    let subject = "Server Logs";
    let emailbody = "Daily server log file";
    let fileAttachment = "server.log";
    const filePath = "./logs/";
    sendMail(recvr, subject, emailbody, fileAttachment, filePath); //server.log

    // Due to changes in the logging format where it consolidated all errors to one file (server.log) - the followings were removed: 4-Dec-21
    // fileAttachment = "exceptions.log";
    // subject = "Exception Logs";
    // emailbody = "Daily exception log file";
    // sendMail(recvr, subject, emailbody, fileAttachment, filePath);

    // fileAttachment = "rejections.log";
    // subject = "Rejection Logs";
    // emailbody = "Daily rejection log file";
    // sendMail(recvr, subject, emailbody, fileAttachment, filePath);
  },
  null,
  true,
  "Pacific/Auckland"
);

mailJob.start();

// HOME ROUTES
router.get("/", home.index);
router.get("/home", home.home_page);
router.get("/closed", home.undercons_get);

//LOGINS ROUTES
router.get("/login", logins.login_get);
router.post("/login", logins.login_post);
router.get("/logout", logins.logout_get);

//USERS ROUTES
router.get("/register", users.register_get);
router.post("/register", users.register_post);
router.get("/user_list", users.user_list);
router.get("/user_edit/:id", users.user_edit_get);
router.post("/user_edit/:id", users.user_edit_post);
router.get("/user_edit/delete/:id", users.user_delete_get);
router.get("/bulk_update_company", users.users_bulk_change_company); //added: 24-Oct-20
router.get("/get_bulk_update_company", users.get_users_bulk_change_company); //added: 26-Oct-20
router.get("/profile", users.user_profile_get);
router.post("/profile", users.user_profile_post);
router.get("/passwd", users.user_passwd_get);
router.post("/passwd", users.user_passwd_post);
router.get("/forgot", users.forgot_get);
router.post("/forgot", users.forgot_post);
router.get("/reset/:token", users.reset_token_get);
router.post("/reset/:token", users.reset_token_post);

//router.get("/passwd_dump", users.dump_pwd);
//router.get("/rm_pwd", users.rm_pwd);

//INDUCTIONS ROUTES

const util = require("util");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const db = require("../config/db");
const fs = require("fs");
// const upload = require("../middleware/upload");
// const { fileUpload, uploadFiles } = require("../middleware/upload_new");

//download log files
router.get("/getlogs/show", (req, res) => {
  if (!req.session.userId || req.session.level < 5) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  res.render("logviewer", {
    userlevel: req.session.level,
    username: req.session.username,
    email: req.session.email,
    version: package.version,
  });
});
router.get("/getlogs/access", async (req, res) => {
  if (!req.session.userId || req.session.level < 5) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  // fs.readFile("./server/access/access.log", "utf8", function (err, data) {
  //   if (err) {
  //     return console.log(err);
  //   }
  //   console.log(data);
  // res.render("logviewer", {
  //   serverlog: data,
  //   userlevel: req.session.level,
  //   username: req.session.username,
  //   email: req.session.email,
  // });
  // });

  const fname = "./server/access/access.log";
  const readStream = fs.createReadStream(fname);
  readStream.on("open", () => {
    readStream.pipe(res);
  });
  readStream.on("error", (err) => {
    res.end(err);
  });
  // readStream.on("close", res.redirect("/home"));
});

router.get("/getlogs/download/access", (req, res) => {
  if (!req.session.userId || req.session.level < 5) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }
  res.download("./server/access/access.log");
});

// router.get("/getlogs/exceptions", (req, res) => {
//   res.download("./logs/exceptions.log");
// });
// router.get("/getlogs/rejections", (req, res) => {
//   res.download("./logs/rejections.log");
// });

// exceptions.log
// rejections.log;

router.get("/getlogs/server", logfile.logfile_get);
router.get("/db_inductions", inductions.db_inductions);
router.get("/sked/create", inductions.sked_create_get);
router.get("/sked/fillup", inductions.sked_display_get);

const ssPhoto = multer.memoryStorage();
const ssCrop = multer({ storage: ssPhoto });

// console.log("ssCrop", ssCrop.fields);

router.post(
  "/sked/create",
  ssCrop.fields([
    { name: "ss_photo", maxCount: 1 },
    { name: "headshot", maxCount: 1 },
  ]),
  inductions.sked_create_post
);

router.post(
  "/book_update",
  ssCrop.fields([
    { name: "ss_photo", maxCount: 1 },
    { name: "headshot", maxCount: 1 },
  ]),
  inductions.book_update_post
);

router.get("/sked/delete/:id", inductions.sked_delete_get);
router.get("/booking/:id", inductions.booking_update_get);
// router.post("/booking/:id", inductions.booking_update_post);

router.get("/booking/delete/:id", inductions.book_delete_get);
router.get("/print", inductions.list_export_get);
router.get("/getInductionList", inductions.get_list_inductions);
router.post("/book_update", inductions.book_update_post);

// ===========================================================================================================================================================================================
// These routines are now done on the client side --> 21-Nov-21. The decision to put these in the client side SOLVED a lot of issues such as R14 errors in Heroku (memory allocation excesses),
// errors during preparation of the excel file, such as images not being found in the temporary folder - which in actuality is really there, this error stems from the
// asynchronous nature of the file I/O operations in NodeJS
//
// router.get("/generate", inductions.generateFile);
// router.get("/download", inductions.download_export_get); //this is now done on the client side --> 21-Nov-21
// ===========================================================================================================================================================================================

router.get("/email", inductions.email_export_get);
router.get("/image/:filename", inductions.show_img_get); //download an image - this gets from "docs" bucket of the mongoDb database

//this route is used by the client side (export_list.ejs) where the generation of the Excel file is done
router.get("/getinductions", async (req, res) => {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  let dateval = Object.values(req.query);

  console.log(dateval);
  if (dateval === undefined) {
    dateval[0] = moment().format("YYYY-MM-DD");
    dateval[1] = moment().format("YYYY-MM-DD");
  }

  // getInductionList() found below
  const list_users = await getInductionList(
    dateval,
    req.session.level,
    req.session.userId
  );

  res.json(list_users); //data for use in the generation of Excel file in the client side (export_list.ejs)
});

//ROUTE FOR THE CONSTANT UPDATES OF THE DASHBOARD
router.get("/getskedupdate", dashboard.get_sked_data);

//TRAINING ROUTES
router.get("/db_trainings", trainings.db_trainings);
router.get("/train/create", trainings.train_create_get);
router.post("/train/create", trainings.train_create_post);
router.get("/train/fillup", trainings.train_display_get);
router.get("/train/delete/:id", trainings.train_delete_get);

router.get("/training", trainings.training_create_get);
router.post("/training", trainings.training_create_post);
router.get("/training/delete/:id", trainings.training_delete_get);

router.get("/training/:id", trainings.training_update_get);
router.post("/training/:id", trainings.training_update_post);

router.get("/print_trainings", trainings.train_export_get);

router.get("/train_booking/edit/:id", trainings.train_booking_update_get);
router.post("/train_booking/edit/:id", trainings.train_booking_update_post);
router.get("/train_booking/delete/:id", trainings.train_booking_delete_get);

router.get("/train_download", trainings.train_download_export_get);
router.get("/train_email", trainings.train_email_export_get);

//OTHER BOOKINGS ROUTES
router.get("/db_genskeds", genskeds.db_genskeds);
router.get("/gensked", genskeds.gensked_create_get);
router.post("/gensked", genskeds.gensked_create_post);

router.get("/gensked/:id", genskeds.gensked_update_get);
router.post("/gensked/:id", genskeds.gensked_update_post);
router.get("/gensked/delete/:id", genskeds.gensked_delete_get);

router.get("/book_gensked/create", genskeds.book_create_get);
router.post("/book_gensked/create", genskeds.book_create_post);
router.get("/book_gensked/fillup", genskeds.book_fillup);

router.get("/gensked_booking/edit/:id", genskeds.gensked_booking_update_get);
router.post("/gensked_booking/edit/:id", genskeds.gensked_booking_update_post);

router.get("/book_gensked/cancel/:id", genskeds.book_cancel_get);
router.get("/book_gensked/delete/:id", genskeds.book_delete_get);
router.get("/print_genskeds", genskeds.gensked_export_get);
router.get("/gensked_download", genskeds.gensked_download_export_get);
router.get("/gensked_email", genskeds.gensked_email_export_get);

// HOLIDAYS ROUTES
router.get("/holiday", holidays.holiday_create_get);
router.post("/holiday", holidays.holiday_create_post);
router.get("/holiday/delete/:id", holidays.holiday_delete_get);

router.get("/holiday/:id", holidays.holiday_update_get);
router.post("/holiday/:id", holidays.holiday_update_post);

//ROUTE for the updating of NO SECOND SESSION -- Added: 05-Feb-21
router.get("/settings", settings.get_settings);
router.post("/settings", settings.post_settings);

//CHAT ROUTES
router.get("/chat", chats.chat_get);
router.get("/monitor", loginmonitor.login_monitor_get);

router.get("/livebooking", livebooking.live_booking_get);
router.get("/dobill", billing.dobill_get);
module.exports = router;
