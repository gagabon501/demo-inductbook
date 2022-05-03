const appLogger = require("../controllers/logger"); //using winston --> added: 04-Dec-21
const Sked = require("../models/sked");
const {
  exportToExcel,
  downloadImage,
  pExportToExcel,
  genExcelJS,
} = require("./gaglib"); //Own lib added: 19-Jan-21

const { export2Excel } = require("./excelExport"); //added: 30-Nov-21

const moment = require("moment");
const Clipper = require("image-clipper");
const dotenv = require("dotenv");
dotenv.load();

const fs = require("fs");
//Inductions - Export to Excel

//Used inside generateFile()
const prepSiteSafeImages = async (fileList) => {
  fileList.forEach(async (file) => {
    console.log(file.ssUrl, file.ss_photo_filename);
    cropImage(file.ssUrl, file.ss_photo_filename, 200, 200);
  });
};

//Used inside generateFile()
const prepHeadShotImages = async (fileList) => {
  fileList.forEach(async (file) => {
    console.log(file.headUrl, file.headshot);
    cropImage(file.headUrl, file.headshot, 200, 200);
  });
};

//Prepares the Excel file for the list of inductions--> can be used in the auto-emailing --> check this
const generateFile = async (req, res) => {
  // console.log("referrer: ", req.headers.referer); // http://localhost:5000/print/?data1=2021-11-16&data2=2021-11-17
  let dateval = [];
  let redirectUrl = "/print";
  const url = req.headers.referer;
  const protocol = req.headers.referer.substring(
    0,
    req.headers.referer.indexOf(":")
  );

  if (url.indexOf("?") != -1) {
    const indexFirstEqual = url.indexOf("=");
    const indexSecondEqual = url.indexOf("=", indexFirstEqual + 1);
    const dateFrom = url.slice(indexFirstEqual + 1, indexFirstEqual + 11);
    const dateTo = url.slice(indexSecondEqual + 1, indexSecondEqual + 11);

    console.log("dateFrom: ", dateFrom);
    console.log("dateTo: ", dateTo);
    dateval[0] = dateFrom;
    dateval[1] = dateTo;
    redirectUrl = "/print/?data1=" + dateFrom + "&" + "data2=" + dateTo;
  } else {
    dateval[0] = undefined;
    dateval[1] = undefined;
  }

  if (req.session.userId) {
    const regex = /print/gi;
    if (regex.test(req.headers.referer)) {
      const list_users = await getInductionList(
        dateval,
        req.session.level,
        req.session.userId
      );

      const colHeaders = [
        {
          header: "No.",
          key: "num",
          width: 4,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Photo",
          key: "photo",
          width: 27,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Firstname",
          key: "firstname",
          width: 20,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Last Name",
          key: "lastname",
          width: 20,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Phone",
          key: "phone",
          width: 15,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Company",
          key: "company",
          width: 30,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "SiteSafe",
          key: "sitesafe",
          width: 27,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Expiry",
          key: "expiry",
          width: 20,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "SiteSafe Photo",
          key: "ss_photo",
          width: 27,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Constructsafe",
          key: "constructsafe",
          width: 20,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Booked On",
          key: "booked_on",
          width: 20,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Session",
          key: "session",
          width: 20,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Date Booked",
          key: "date_booked",
          width: 20,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Booked by",
          key: "booked_by",
          width: 50,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Emergency Contact Person",
          key: "e_person",
          width: 40,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Emergency Contact Number",
          key: "e_num",
          width: 40,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "FCC Authorised By",
          key: "fcc_supervisor",
          width: 20,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Workpack Number",
          key: "workpack",
          width: 20,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "Company Supervisor",
          key: "supervisor",
          width: 20,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
        {
          header: "1st Tier Contractor",
          key: "first_tier",
          width: 20,
          style: { alignment: { vertical: "middle", horizontal: "center" } },
        },
      ];

      let newList = [];
      let urlList = [];
      //Discovered that the array of objects returned by the find() method has the actual data located in the '_doc' property

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
        urlList.push(tmpObj); //push the new object to the newList array of objects --> 14-Nov-21
      });

      let num = 1;

      list_users.forEach((user) => {
        user._doc.date_attend = moment(user._doc.date_attend).format(
          "DD-MM-YYYY"
        ); //"_doc" --> this is a mongoose object -- discovered this by accident!
        user._doc.expiry = moment(user._doc.expiry).format("DD-MM-YYYY");
        user._doc.bookdate = moment(user._doc.bookdate).format("DD-MM-YYYY");
        // console.log("constructsafe: ", user._doc.constructsafe);
        const newSSFname = user._doc.ss_photo_filename.replace(/\s+/g, "");
        const newHeadshotFname = user._doc.headshot.replace(/\s+/g, "");

        newList.push([
          num++,
          user._doc.headshot ? newHeadshotFname : "",
          user._doc.firstname ? user._doc.firstname : "",
          user._doc.lastname ? user._doc.lastname : "",
          user._doc.phone ? user._doc.phone : "",
          user._doc.company ? user._doc.company : "",
          user._doc.sitesafe ? user._doc.sitesafe : "",
          user._doc.expiry ? user._doc.expiry : "",
          user._doc.ss_photo_filename ? newSSFname : "",
          user._doc.constructsafe ? user._doc.constructsafe : "",
          user._doc.date_attend ? user._doc.date_attend : "",
          user._doc.session_title ? user._doc.session_title : "",
          user._doc.bookdate ? user._doc.bookdate : "",
          user._doc.bookedby ? user._doc.bookedby : "",
          user._doc.emergency_person ? user._doc.emergency_person : "",
          user._doc.emergency_phone ? user._doc.emergency_phone : "",
          user._doc.fcc_supervisor ? user._doc.fcc_supervisor : "",
          user._doc.workpack ? user._doc.workpack : "",
          user._doc.company_supervisor ? user._doc.company_supervisor : "",
          user._doc.first_tier ? user._doc.first_tier : "",
        ]);
      });

      try {
        prepSiteSafeImages(urlList)
          .then(() => {
            console.log("Done cropping site safe images");
          })
          .then(() => {
            prepHeadShotImages(urlList).then(() => {
              console.log("Done cropping HEADSHOT images");
            });
          })
          .then(() => {
            const tableHeading = "LIST OF INDUCTION ATTENDEES";
            const exportFilename = "ListAttendees.xlsx";
            const isCron = false; //not running in cron environment so no auto-email --> 17-Nov-21
            console.log("Creating EXCEL FILE");

            genExcelJS(colHeaders, newList, exportFilename, isCron);
          })
          .catch((err) => {
            throw err;
          });
        res.redirect(redirectUrl);
      } catch (error) {
        throw error;
      }
    } else {
      res.redirect("/print");
    }
  } else {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    // req.flash("error", "Not authorized! Go back!");
    return res.redirect("/logout");
  }
};

//The following routine is next to be re-factored: 24-Nov-21 --> Use ExcelJS and promises as used in the client side --> see "export_list.ejs" for implementation
//===============================================================================================================================================================
//Inductions here - auto emailing of List of inductions in Excel format
const exportInductions = async (dateval, userLevel, userId, url) => {
  const list_users = await getInductionList(dateval, userLevel, userId);
  if (list_users.length === 0) {
    appLogger.info("Empty INDUCTION attendees. Aborting..");

    // console.log("Empty INDUCTION attendees. Aborting..");
    return false;
  }
  // console.log("url:", url);

  const colHeadings = [
    "No.",
    "Photo",
    "First Name",
    "Last Name",
    "Phone",
    "Company",
    "SiteSafe",
    "Expiry",
    "SiteSafe Photo",
    "Constructsafe",
    "Booked On",
    "Session",
    "Date Booked",
    "Booked By",
    "Emergency Contact Person",
    "Emergency Contact Number",
    "FCC Authorised By",
    "Workpack Number",
    "Company Supervisor",
    "1st Tier Contractor",
  ];

  //Discovered that the array of objects returned by the find() method has the actual data located in the '_doc' property
  let tmp = "";

  Clipper.configure({ canvas: require("canvas") });

  list_users.forEach((user) => {
    user._doc.date_attend = moment(user._doc.date_attend).format("DD-MM-YYYY"); //"_doc" --> this is a mongoose object -- discovered this by accident!
    user._doc.expiry = moment(user._doc.expiry).format("DD-MM-YYYY");
    user._doc.bookdate = moment(user._doc.bookdate).format("DD-MM-YYYY");

    downloadImage(
      url + user._doc.ss_photo_filename,
      "./tmp_img/" + user._doc.ss_photo_filename,
      () => {
        console.log("downloaded ss_photo: ", user._doc.ss_photo_filename);
        Clipper("./tmp_img/" + user._doc.ss_photo_filename, function () {
          this.resize(200, 200).toFile(
            "./tmp_img/" + "cropped-" + user._doc.ss_photo_filename,
            function () {
              console.log("saved cropped!");
            }
          );
        });
      }
    );

    downloadImage(
      url + user._doc.headshot,
      "./tmp_img/" + user._doc.headshot,
      () => {
        console.log("downloaded headshot: ", user._doc.headshot);
        Clipper("./tmp_img/" + user._doc.headshot, function () {
          this.resize(200, 200).toFile(
            "./tmp_img/" + "cropped-" + user._doc.headshot,
            function () {
              console.log("saved cropped!");
            }
          );
        });
      }
    );
  });

  //Crop images
  // list_users.forEach((user) => {
  //   console.log(`To be cropped ${"./tmp_img/" + user._doc.ss_photo_filename}`);
  // });

  let newList = [];

  list_users.forEach((user) => {
    newList.push([
      user._doc.headshot ? user._doc.headshot : "",
      user._doc.firstname ? user._doc.firstname : "",
      user._doc.lastname ? user._doc.lastname : "",
      user._doc.phone ? user._doc.phone : "",
      user._doc.company ? user._doc.company : "",
      user._doc.sitesafe ? user._doc.sitesafe : "",
      user._doc.expiry ? user._doc.expiry : "",
      user._doc.ss_photo_filename ? user._doc.ss_photo_filename : "",
      user._doc.constructsafe ? user._doc.constructsafe : "",
      user._doc.date_attend ? user._doc.date_attend : "",
      user._doc.session_title ? user._doc.session_title : "",
      user._doc.bookdate ? user._doc.bookdate : "",
      user._doc.bookedby ? user._doc.bookedby : "",
      user._doc.emergency_person ? user._doc.emergency_person : "",
      user._doc.emergency_phone ? user._doc.emergency_phone : "",
      user._doc.fcc_supervisor ? user._doc.fcc_supervisor : "",
      user._doc.workpack ? user._doc.workpack : "",
      user._doc.company_supervisor ? user._doc.company_supervisor : "",
      user._doc.first_tier ? user._doc.first_tier : "",
    ]);
  });

  const colWidths = [
    5, 30, 15, 15, 15, 30, 20, 15, 30, 20, 15, 30, 15, 30, 30, 30, 30, 20, 20,
    20,
  ];
  // "No."                     , "Photo"                     , "First Name"        , "Last Name"          , "Phone",
  // "Company"                 , "SiteSafe"                  , "Expiry"            , "SiteSafe Photo"     , "Constructsafe",
  // "Booked On"               , "Session"                   , "Date Booked"       , "Booked By"          , "Emergency Contact Person",
  // "Emergency Contact Number", "FCC Authorised By"         , "Workpack Number"   ,  "Company Supervisor","1st Tier Contractor";

  const tableHeading = "LIST OF INDUCTION ATTENDEES";
  const exportFilename = "ListAttendees.xlsx";

  const isCron = true;

  //let's delay the excel export for 1-minute and see if this solves the problem
  setTimeout(() => {
    console.log("Exporting to Excel now...");
    pExportToExcel(
      colHeadings,
      colWidths,
      newList,
      tableHeading,
      exportFilename,
      isCron
    );
  }, 120000);

  return list_users;
}; //exportInductions

//Function to get the list of induction - promise-based
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
          "firstname lastname phone company sitesafe expiry date_attend session session_title bookdate bookedby emergency_person emergency_phone ss_photo_filename headshot fcc_supervisor workpack  company_supervisor first_tier"
        )
        .sort({ date_attend: 1, session: 1 })
    );
  });
};

//Trainings here
const exportTrainList = async (dateval, userLevel, userId, subject) => {
  const list = await getTrainList(dateval, userLevel, userId);
  if (list.length === 0) {
    // console.log("Empty TRAINING attendees. Aborting..");
    appLogger.info("Empty TRAINING attendees. Aborting..");
    return false;
  }
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
  exportToExcel(
    colHeadings,
    colWidths,
    newList,
    tableHeading,
    exportFilename,
    subject
  );
  return list;
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

const exportGenSkedList = async (dateval, userLevel, userId, subject) => {
  const list = await getGenSkidList(dateval, userLevel, userId);
  //console.log(list);
  if (list.length === 0) {
    // console.log("Empty OTHER BOOKING attendees. Aborting..");
    appLogger.info("Empty OTHER BOOKING attendees. Aborting..");
    return false;
  }

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
  exportToExcel(
    colHeadings,
    colWidths,
    newList,
    tableHeading,
    exportFilename,
    subject
  );
  return list;
}; //exportGenSkedList

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

module.exports = {
  sendList: (date_from, date_to, userLevel, userId) => {
    const dateval = [date_from, date_to];
    const url =
      process.env.DEVELOPMENT == "1"
        ? "http://localhost:5000/image/"
        : "https://inductbook.safenode.co.nz/image/";

    // exportInductions(dateval, userLevel, userId, url); //removed: 30-Nov-21
    export2Excel(dateval); //in excelExport.js --> helpers folder --> 30-Nov-21

    exportTrainList(dateval, userLevel, userId, "List of Training Attendees"); //20-Nov-21 --> removed temporarily since there are no trainings and other bookings
    exportGenSkedList(
      dateval,
      userLevel,
      userId,
      "List of Attendees - Other Bookings"
    );
  },

  doCleanUp: () => {
    console.log("cleanup...");

    // const baseDateTime = moment().subtract(2, "minutes"); //2-minutes ago
    const baseDateTime = moment().subtract(30, "minutes"); //30-minutes ago --> as per Darren's email: 18-Nov-21

    Sked.find({
      $and: [
        { lastname: { $eq: "lastname" } },
        { bookdate: { $lt: baseDateTime } },
      ],
    }).exec(function (err, list_users) {
      if (err) {
        return next(err);
      }

      //console.log(JSON.stringify(list_users));

      // if (JSON.stringify(list_users) !== "[]") {
      if (list_users.length > 0) {
        list_users.forEach(function (obj) {
          Sked.findByIdAndRemove(obj._id, (err, todo) => {
            if (err) return res.status(500).send(err);

            console.log(
              "Deleted => " +
                obj.lastname +
                " " +
                obj.firstname +
                " " +
                obj.company +
                " " +
                moment(obj.date_attend).format("MM-DD-YYYY")
            );
          });
        });
      } else {
        console.log("nothing to delete");
      }
    }); //exec
  },
};
