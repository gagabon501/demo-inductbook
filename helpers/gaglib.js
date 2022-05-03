const appLogger = require("../controllers/logger"); //using winston --> added: 04-Dec-21
const Sked = require("../models/sked");
const Training = require("../models/trainings");
const GenSked = require("../models/gensked");
const Holiday = require("../models/holidays");
const Setting = require("../models/settings");
const User = require("../models/user");

const async = require("async");
const xlFile = require("excel4node");
const moment = require("moment");
const nodemailer = require("nodemailer");
const util = require("util");

const fs = require("fs");
const path = require("path");
const request = require("request");
// const { resolve } = require("path");
// const reqPromise = util.promisify(request);

const Jimp = require("jimp");
const xlsx = require("exceljs");

const dotenv = require("dotenv");
dotenv.load(); //load environment variables

//Preparation for the downloading of images from MongoDb --> 22-Nov-21
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const uri =
  process.env.DEVELOPMENT == "1"
    ? "mongodb://127.0.0.1:27017"
    : process.env.MONGODB_URI;
// console.log("URI: ", uri);
mongoose.connect(uri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

Grid.mongo = mongoose.mongo;
const connection = mongoose.connection; //most important object to get data from MongoDb --> 22-Nov-21

const getEmailRecipients = () => {
  return new Promise((resolve, reject) => {
    resolve(User.find({ level: { $gt: 1 } }).exec());
  });
};

const emailFile = async (recvr, subject, emailbody, fileAttachment) => {
  const transporter = nodemailer.createTransport({
    pool: true,
    host: "mail.supremecluster.com",
    port: 465,
    secure: true, // use TLS
    auth: {
      user: process.env.USERMAIL,
      pass: process.env.MAILPWD,
    },
  });

  if (fileAttachment) {
    var mailOptions = {
      attachments: [
        {
          path: "./" + fileAttachment,
        },
      ],
      from: "no-reply@safenode.co.nz",
      to: recvr,
      cc: "inductbook@gmail.com",
      subject: subject,
      text: emailbody,
    };
  } else {
    var mailOptions = {
      from: "no-reply@safenode.co.nz",
      to: recvr,
      cc: "inductbook@gmail.com",
      subject: subject,
      text: emailbody,
    };
  }

  transporter.sendMail(mailOptions, function (error, info) {
    error
      ? appLogger.error(error)
      : appLogger.info("Email sent: " + recvr + " " + info.response);
    transporter.close();
  });
};

const getHolidays = () => {
  return new Promise((resolve, reject) => {
    const today = new Date();
    resolve(
      Holiday.find({
        $and: [{ date_holiday: { $gte: today } }, { train_type: { $ne: 2 } }],
      }).exec()
    );
  });
};

const pickSettings = () => {
  return new Promise((resolve) => {
    resolve(Setting.find({}));
  });
};

//formatDate version local to this module
const formDate = (date) => {
  var d = new Date(date),
    month = "" + (d.getMonth() + 1), //this one is added due to NZ time zone - to confirm this try using W3 Schools samples on getMonth() function
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;
  return [year, month, day].join("-");
}; //formatDate

const updtTraining = (t_avail) => {
  return new Promise((resolve, reject) => {
    const md1 = moment().format("YYYY-MM-DDT00:00:00.000") + "Z";
    resolve(
      Training.find({
        $and: [
          { train_date: { $gt: md1 } },
          {
            $or: [
              { train_avail: { $eq: t_avail } },
              { train_avail: { $eq: "Both" } },
            ],
          },
        ],
      })
        .sort({ train_date: 1 })
        .exec(function (err, list_training) {
          if (err) {
            return next(err);
          }

          list_training.forEach(function (obj) {
            async.parallel(
              {
                totrec1: function (callback) {
                  Sked.countDocuments(
                    {
                      $and: [
                        { train_id: { $eq: obj._id } },
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
                        { train_id: { $eq: obj._id } },
                        { session: { $eq: "2" } },
                      ],
                    },
                    callback
                  ); // Pass an empty object as match condition to find all documents of this collection
                },
              },
              function (err, results) {
                var userData = new Training({
                  train_tot_session1: results.totrec1,
                  train_tot_session2: results.totrec2,
                  _id: obj._id,
                });
                Training.findByIdAndUpdate(
                  obj._id,
                  userData,
                  {},
                  function (err, thebooking) {
                    if (err) {
                      return next(err);
                    }
                  }
                ); //Sked.findByIdAndUpdate
              }
            ); //async parallel
          }); //list_training.forEach()
        }) //exec
    );
  });
};

const updtGenSked = () => {
  return new Promise((resolve, reject) => {
    const md1 = moment().format("YYYY-MM-DDT00:00:00.000") + "Z";
    resolve(
      GenSked.find({ gensked_date: { $gt: md1 } })
        .sort({ gensked_date: 1 })
        .exec(function (err, genskeds) {
          if (err) {
            return next(err);
          }

          genskeds.forEach(function (obj) {
            async.parallel(
              {
                totrec: function (callback) {
                  Sked.countDocuments({ train_id: { $eq: obj._id } }, callback); // Pass an empty object as match condition to find all documents of this collection
                },
              },
              function (err, results) {
                var userData = new GenSked({
                  gensked_tot_booking: results.totrec,
                  _id: obj._id,
                });
                GenSked.findByIdAndUpdate(
                  obj._id,
                  userData,
                  {},
                  function (err, thebooking) {
                    if (err) {
                      return next(err);
                    }
                  }
                ); //Sked.findByIdAndUpdate
              }
            ); //async parallel
          }); //list_training.forEach()
        }) //exec
    );
  });
};
//generate excel file using exceljs
const genExcel = async (colHeaders, dataLists, filename) => {
  const wb = new xlsx.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  let ssId = "";
  let hsId = "";
  let row = 0;
  let currRow = "";
  ws.columns = colHeaders;
  regex = /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i; //regex to validate images --> 14-Nov-21

  dataLists.forEach((data) => {
    // console.log("./tmp_img/cropped-" + data[1]);
    // console.log("data[1]", data[1]);
    // console.log("data[8]", data[8]);
    // console.log(data);
    const ext1 =
      data[1].slice(data[1].indexOf(".") + 1).toLowerCase === "jpg" || "jpeg"
        ? "jpeg"
        : "png";
    const ext2 =
      data[8].slice(data[8].indexOf(".") + 1).toLowerCase === "jpg" || "jpeg"
        ? "jpeg"
        : "png";

    ws.addRow(data); //stuff data on each row

    currRow = ws.lastRow; //get the current row
    currRow.height = 150; //adjust row heiht

    ws.getCell(`B${row + 2}`).value = null;
    ws.getCell(`I${row + 2}`).value = null;

    //check if the current data[1] has an image extenstion - if so, add image

    if (regex.test(data[1])) {
      const fname1 = "./uploads_img/" + data[1].replace(/\s+/g, "");
      ssId = wb.addImage({
        // filename: "./tmp_img/cropped-" + data[1],
        // filename: "./uploads_img/" + data[1],
        // buffer: fs.readFileSync(`./uploads_img/${data[1]}`),
        buffer: fs.readFileSync(fname1),
        extension: ext2,
      });
      ws.addImage(ssId, {
        tl: { col: 1, row: row + 1 },
        ext: { width: 200, height: 200 },
      });
    }
    // filename.replace(/\s+/g, "");
    if (regex.test(data[8])) {
      const fname2 = "./uploads_img/" + data[8].replace(/\s+/g, "");
      hsId = wb.addImage({
        // filename: "./tmp_img/cropped-" + data[8],
        // filename: "./uploads_img/" + data[8],
        buffer: fs.readFileSync(fname2),
        extension: ext1,
      });
      ws.addImage(hsId, {
        tl: { col: 8, row: row + 1 },
        ext: { width: 200, height: 200 },
      });
    }

    row++;
  });

  // await insertImgExcel(dataLists, wb, ws);

  await wb.xlsx.writeFile(filename); //promise based?
};

const forExport = async (
  colHeadings,
  colWidths,
  dataLists,
  tableHeading,
  exportFilename,
  isCron
) => {
  // console.log("For export");

  const wb = new xlFile.Workbook();
  const ws = wb.addWorksheet("Sheet 1");
  regex = /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i;

  const headingStyle = wb.createStyle({
    font: {
      bold: true,
    },
    alignment: {
      wrapText: true,
      horizontal: "center",
    },
  });

  const myStyle = wb.createStyle({
    font: {
      bold: true,
    },
    alignment: {
      wrapText: true,
      horizontal: "center",
    },
    border: {
      left: {
        style: "thin",
      },
      right: {
        style: "thin",
      },
      top: {
        style: "thin",
      },
      bottom: {
        style: "thin",
      },
    },
  });

  const dataStyle = wb.createStyle({
    alignment: {
      wrapText: true,
      horizontal: "center",
      vertical: "center",
    },
    border: {
      left: {
        style: "thin",
      },
      right: {
        style: "thin",
      },
      top: {
        style: "thin",
      },
      bottom: {
        style: "thin",
      },
    },
  });

  ws.cell(1, 1, 1, colHeadings.length, true)
    .string(tableHeading)
    .style(headingStyle);

  ws.cell(2, 1).string("Run date: " + moment().format("DD-MMM-YYYY @ LT"));

  //set column header titles
  colHeadings.forEach((colHeading, index) => {
    ws.cell(3, index + 1)
      .string(colHeading)
      .style(myStyle);
  });

  //set column width
  colWidths.forEach((colWidth, index) => {
    ws.column(index + 1).setWidth(colWidth);
  });

  let i = 0;
  let j = 1;
  let fname = "";

  // ws.addImage({
  //   path: "./tmp_img/cropped-1636961688850-fccmap.png",
  //   type: "picture",
  //   position: {
  //     type: "oneCellAnchor",
  //     from: {
  //       col: 3,
  //       colOff: 0,
  //       row: 3,
  //       rowOff: 0,
  //     },
  //   },
  // });

  //stuff data into each cell
  // console.log("For excel: ", dataLists); //array of arrays

  dataLists.forEach((dataArr, index) => {
    i++;
    ws.row(i + 3).setHeight(150);
    ws.cell(i + 3, 1)
      .number(i)
      .style(dataStyle);

    dataArr.forEach((data) => {
      j++;

      if (typeof data === "string") {
        if (regex.test(data)) {
          fname = "./tmp_img/" + "cropped-" + data;
          if (fs.existsSync(fname)) {
            ws.addImage({
              path: fname,
              type: "picture",
              position: {
                type: "oneCellAnchor",
                from: {
                  col: j,
                  colOff: 0,
                  row: i + 3,
                  rowOff: 0,
                },
              },
            });
          } else {
            appLogger.error(`${fname} not found`);
          }
        } else {
          ws.cell(i + 3, j)
            .string(data)
            .style(dataStyle);
        }
      }
    });
    j = 1;
  });
  // wb.write(exportFilename);
  wb.write(exportFilename, async function (err, stats) {
    if (err) {
      console.error(err);
      return err;
    } else {
      appLogger.info("Excel file created.");
      //if isCron email the file
      if (isCron) {
        const admins = await getEmailRecipients();
        let emails = [];
        let subject = "";
        let emailbody = "see attachment";

        admins.forEach((admin) => {
          emails.push(admin.email);
        });

        emails = ["gagabon@safenode.co.nz"]; //remove after test
        subject = "List of Attendees for EHS Induction";
        // emailFile(emails, subject, emailbody, "ListAttendees.xlsx"); //located at the top of this file
        emailFile(emails, subject, emailbody, exportFilename); //located at the top of this file
      }
      return dataLists;
    }
  });
};

// await sharp(req.files["headshot"][0].buffer)
//   .resize(600, 600, {
//     fit: sharp.fit.inside,
//     withoutEnlargement: true, // if image's original width or height is less than specified width and height, sharp will do nothing(i.e no enlargement)
//   })
//   .toFile(
//     "./uploads_img/" + req.files["headshot"][0].originalname.toLowerCase()
//   );
const insertImgExcel = async (dataLists, wb, ws) => {
  let row = 0;
  const promises = dataLists.map(async (data, index) => {
    if (row === 1) {
      const url1 = `http://localhost:5000/image/${data[1]}`;
      console.log("url1: ", url1);

      // const ret = await fetch(url);
      const ret = await request.head(url1, (err, res, bod) => {
        request(url1);
      });
      // console.log(ret);
      const bufferData = ret.map((response) => response.buffer());
      const ssId = wb.addImage({
        buffer: Buffer.from(bufferData),
        extension: "png",
      });
      ws.addImage(ssId, {
        tl: { col: 1, row: row + 1 },
        ext: { width: 200, height: 200 },
      });
    } else {
      if (row === 8) {
        const url2 = `http://localhost:5000/image/${data[8]}`;
        console.log("url2: ", url2);

        // const ret = await fetch(url);
        // const ret = await request.head(url2, (err, res, bod) => {
        //   request(url2);
        // });
        // const bufferData = ret;
        // const hsId = wb.addImage({
        //   buffer: Buffer.from(bufferData),
        //   extension: "png",
        // });
        // ws.addImage(hsId, {
        //   tl: { col: 1, row: row + 1 },
        //   ext: { width: 200, height: 200 },
        // });
      }
    }
    row++;
  });
  await Promise.all(promises);
};

async function insertImg2excel({ wb, ws, data, col, ext, fieldName }) {
  const promises = data.map(async (d, i) => {
    const url = d[fieldName];
    if (!url) {
      return;
    }
    const ret = await fetch(url);
    const bufferData = await ret.arrayBuffer();
    const imgId = wb.addImage({
      buffer: Buffer.from(bufferData),
      extension: "png",
    });
    // ws.addImage(imgId, {
    //     tl: { col, row: i + 1 },
    //     ext
    // })
    ws.addImage(imgId, {
      tl: { col: col, row: i + 1 }, // top left
      br: { col: col + 1, row: i + 2 }, // bot right
    });
  });
  await Promise.all(promises);
}

//Modules for exports from here downwards
module.exports = {
  downloadImage: (url, path, cb) => {
    request.head(url, (err, res, bod) => {
      request(url).pipe(fs.createWriteStream(path)).on("close", cb);
    });
  },
  cropImage: async (url, filename, height, width) => {
    let regex = /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i; //regex to validate images --> 14-Nov-21

    const newFname = filename.replace(/\s+/g, "");
    // console.log(url, filename);

    if (regex.test(filename)) {
      const image = await Jimp.read(url);
      // await image.resize(width, height);
      await image.writeAsync(`./uploads_img/${newFname}`);
    }
  },
  downloadImageFromDb: (dataList) => {
    const mongoose = require("mongoose");
    const db = require("../config/db");
    const Grid = require("gridfs-stream");

    const mongoURI = db.url + db.database;

    // Create mongo connection
    const conn = mongoose.createConnection(mongoURI);

    // Init gfs
    let gfs;
    // conn.once("open", () => {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection("docs");
    dataList.forEach((data) => {
      const ss_photo = data._doc.ss_photo_filename;
      const hs_photo = data._doc.headshot;
      console.log(ss_photo);
      const writeStreamHs = fs.createWriteStream(`./uploads_img/${hs_photo}`);
      gfs.files.findOne({ filename: ss_photo }, (err, file) => {
        // Check if file
        if (!file || file.length === 0) {
          return res.status(404).json({
            err: "No file exists",
          });
        }
        // Read output to browser
        const readstream = gfs.createReadStream(file.filename);
        // readstream.pipe(writeStreamHs);
        readstream.pipe(res);
      });
    });
    // });
  },

  genExcelJS: (colHeaders, dataLists, filename, isCron) => {
    genExcel(colHeaders, dataLists, filename, isCron);
  },
  exportToExcel: (
    colHeadings,
    colWidths,
    dataLists,
    tableHeading,
    exportFilename,
    subject
  ) => {
    const wb = new xlFile.Workbook();
    const ws = wb.addWorksheet("Sheet 1");

    const headingStyle = wb.createStyle({
      font: {
        bold: true,
      },
      alignment: {
        wrapText: true,
        horizontal: "center",
      },
    });

    const myStyle = wb.createStyle({
      font: {
        bold: true,
      },
      alignment: {
        wrapText: true,
        horizontal: "center",
      },
      border: {
        left: {
          style: "thin",
        },
        right: {
          style: "thin",
        },
        top: {
          style: "thin",
        },
        bottom: {
          style: "thin",
        },
      },
    });

    const dataStyle = wb.createStyle({
      alignment: {
        wrapText: true,
        horizontal: "center",
        vertical: "center",
      },
      border: {
        left: {
          style: "thin",
        },
        right: {
          style: "thin",
        },
        top: {
          style: "thin",
        },
        bottom: {
          style: "thin",
        },
      },
    });

    ws.cell(1, 1, 1, colHeadings.length, true)
      .string(tableHeading)
      .style(headingStyle);

    ws.cell(2, 1).string("Run date: " + moment().format("DD-MMM-YYYY @ LT"));

    //set column header titles
    colHeadings.forEach((colHeading, index) => {
      ws.cell(3, index + 1)
        .string(colHeading)
        .style(myStyle);
    });

    //set column width
    colWidths.forEach((colWidth, index) => {
      ws.column(index + 1).setWidth(colWidth);
    });

    let i = 0;
    let j = 1;

    dataLists.forEach((dataObj, index) => {
      i++;
      ws.row(i + 3).setHeight(150);
      ws.cell(i + 3, 1)
        .number(i)
        .style(dataStyle);

      for (const [key, value] of Object.entries(dataObj)) {
        j++;
        // console.log(typeof value, value);

        if (typeof value === "string") {
          if (
            value.toLowerCase().indexOf(".jpg") != -1 ||
            value.toLowerCase().indexOf(".jpeg") != -1 ||
            value.toLowerCase().indexOf(".png") != -1
          ) {
            // console.log("IMG: ", value);
            try {
              ws.addImage({
                path: "tmp_img/" + "cropped-" + value,
                type: "picture",
                position: {
                  type: "oneCellAnchor",
                  from: {
                    col: j,
                    colOff: 0,
                    row: i + 3,
                    rowOff: 0,
                  },
                },
              });
            } catch (error) {
              throw error;
            }
          } else {
            ws.cell(i + 3, j)
              .string(value)
              .style(dataStyle);
          }
        } else {
          ws.cell(i + 3, j)
            .date(value)
            .style(dataStyle);
        }
      }
      j = 1;
    });

    // wb.write(exportFilename);
    wb.write(exportFilename, async function (err, stats) {
      if (err) {
        console.error(err);
        return err;
      } else {
        // console.log(stats); // Prints out an instance of a node.js fs.Stats object
        const admins = await getEmailRecipients();
        let emails = [];
        // let subject = "";
        let emailbody = "see attachment";

        admins.forEach((admin) => {
          emails.push(admin.email);
        });

        // emails = ["gagabon@safenode.co.nz"]; //remove after test
        // subject = "List of Attendees for EHS Induction";
        emailFile(emails, subject, emailbody, exportFilename); //located at the top of this file

        return dataLists;
      }
    });
  },

  pExportToExcel: (
    colHeadings,
    colWidths,
    dataLists,
    tableHeading,
    exportFilename,
    isCron
  ) => {
    // setTimeout(() => {
    //   forExport(
    //     colHeadings,
    //     colWidths,
    //     dataLists,
    //     tableHeading,
    //     exportFilename,
    //     isCron
    //   );
    //   console.log("Excel file ready for downloading");
    // }, 20000);
    forExport(
      colHeadings,
      colWidths,
      dataLists,
      tableHeading,
      exportFilename,
      isCron
    );
  },

  //formatDate here
  formatDate: (date) => {
    var d = new Date(date),
      month = "" + (d.getMonth() + 1), //this one is added due to NZ time zone - to confirm this try using W3 Schools samples on getMonth() function
      day = "" + d.getDate(),
      year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    return [year, month, day].join("-");
  }, //formatDate

  sendMail: async (recvr, subject, emailbody, fileAttachment, filepath) => {
    // const bcc = !bcc ? bcc : "inductbook@gmail.com";
    const filePath =
      filepath === null || filepath === undefined || filepath === ""
        ? "./" + fileAttachment
        : filepath + fileAttachment;
    var transporter = nodemailer.createTransport({
      pool: true,
      host: "mail.supremecluster.com",
      port: 465,
      secure: true, // use TLS
      auth: {
        user: process.env.USERMAIL,
        pass: process.env.MAILPWD,
      },
    });

    if (fileAttachment) {
      var mailOptions = {
        attachments: [
          {
            path: filePath,
          },
        ],
        from: "no-reply@safenode.co.nz",
        to: recvr,
        cc: "inductbook@gmail.com",
        subject: subject,
        text: emailbody,
      };
    } else {
      var mailOptions = {
        from: "no-reply@safenode.co.nz",
        to: recvr,
        cc: "inductbook@gmail.com",
        subject: subject,
        text: emailbody,
      };
    }

    transporter.sendMail(mailOptions, function (error, info) {
      error
        ? appLogger.error(error)
        : appLogger.info("Email sent: " + recvr + " " + info.response);
      transporter.close();
    });
  }, //sendMail

  sendHtmlMail: async (
    recvr,
    subject,
    emailbody,
    fileAttachment,
    isInduction
  ) => {
    var transporter = nodemailer.createTransport({
      pool: true,
      host: "mail.supremecluster.com",
      port: 465,
      secure: true, // use TLS
      auth: {
        user: process.env.USERMAIL,
        pass: process.env.MAILPWD,
      },
    });

    const ejs = require("ejs");
    const name = "Gilberto Gabon";

    ejs.renderFile(
      isInduction ? "./views/attendees.ejs" : "./views/training_attendees.ejs",
      { emailbody: emailbody },
      function (err, data) {
        if (err) {
          appLogger.error(err);
        } else {
          if (fileAttachment) {
            var mailOptions = {
              attachments: [
                {
                  path: "./" + fileAttachment,
                },
              ],
              from: "no-reply@safenode.co.nz",
              to: recvr,
              cc: "inductbook@gmail.com",
              subject: subject,
              html: data,
            };
          } else {
            var mailOptions = {
              from: "no-reply@safenode.co.nz",
              to: recvr,
              cc: "inductbook@gmail.com",
              subject: subject,
              html: data,
            };
          }

          transporter.sendMail(mailOptions, function (error, info) {
            error
              ? appLogger.error(error)
              : appLogger.info("Email sent: " + recvr + " " + info.response);
            transporter.close();
          }); //transporter
        }
      }
    ); //ejs.renderFile
  }, //sendHtmlMail

  sendBillMail: async (recvr, subject, emailbody, fileAttachment) => {
    var transporter = nodemailer.createTransport({
      pool: true,
      host: "mail.supremecluster.com",
      port: 465,
      secure: true, // use TLS
      auth: {
        user: process.env.BILLUSER,
        pass: process.env.BILLPWD,
      },
    });

    const ejs = require("ejs");
    const name = "Gilberto Gabon";
    const ccMail =
      process.env.DEVELOPMENT == "1"
        ? ["gagabon@safenode.co.nz", "inductbook@gmail.com"]
        : [
            "gagabon@safenode.co.nz",
            "inductbook@gmail.com",
            "KristinaF@fcc.co.nz",
          ];

    ejs.renderFile(
      "./views/sendbill.ejs",
      { emailbody: emailbody },
      function (err, data) {
        if (err) {
          appLogger.error(err);
        } else {
          if (fileAttachment) {
            var mailOptions = {
              attachments: [
                {
                  path: "./" + fileAttachment,
                },
              ],
              from: "gagabon@safenode.co.nz",
              to: recvr,
              cc: ccMail,
              subject: subject,
              html: data,
            };
          } else {
            var mailOptions = {
              from: "gagabon@safenode.co.nz",
              to: recvr,
              cc: ccMail,
              subject: subject,
              html: data,
            };
          }

          transporter.sendMail(mailOptions, function (error, info) {
            error
              ? appLogger.error(error)
              : appLogger.info("Email sent: " + recvr + " " + info.response);
            transporter.close();
          }); //transporter
        }
      }
    ); //ejs.renderFile
  }, //sendHtmlMail

  getSettings: () => {
    return new Promise((resolve) => {
      resolve(Setting.find({}));
    });
  },

  getSkeds: async (numCards) => {
    const holidays = await getHolidays(); //in gaglib.js

    const settings = await pickSettings(); //defined above -> 22-June-21
    // console.log(settings);
    const blockedDays = settings[0].no_session_days.split(",");
    // console.log("blockedDays", blockedDays);

    let arrSked = [];
    const dHolidays = holidays.map((holiday) => formDate(holiday.date_holiday)); //reformat every element to a sting: 'YYYY-MM-DD' --> in gaglib.js
    const today = new Date();
    let today1 = new Date();

    if (
      today.getHours() >= 15 &&
      today1.getDay() >= 1 &&
      today1.getDay() <= 3
    ) {
      today1.setDate(today1.getDate() + 1); //after 3pm user can only book day after tomorrow
    } else if (today.getHours() >= 13 && today1.getDay() === 5) {
      today1.setDate(today1.getDate() + 3); //Friday after 1pm run: target start day is Tuesday following week
    } else if (today1.getDay() === 6) {
      today1.setDate(today1.getDate() + 2); //Saturday run: target start day is Tuesday following week
    } else if (today1.getDay() === 0) {
      today1.setDate(today1.getDate() + 1); //Sunday run: target start day is Tuesday following week
    }

    let ctr = 0;
    let isBlocked = false;

    do {
      today1.setDate(today1.getDate() + 1);

      if (today1.getDay() === 5) today1.setDate(today1.getDate() + 3); //Fri --> target start day is Monday
      if (today1.getDay() === 6) today1.setDate(today1.getDate() + 2); //Sat --> target start day is Monday
      if (today1.getDay() === 0) today1.setDate(today1.getDate() + 1); //Sun --> target start day is Monday

      //isBlocked ==> added: 22-June-21 --> per request from Tanja to put up a way of blocking days for induction
      // isBlocked =
      //   moment(today1).format("YYYY-MM-DD") >=
      //     moment(settings[0].start_no_second_session).format("YYYY-MM-DD") &&
      //   moment(today1).format("YYYY-MM-DD") <=
      //     moment(settings[0].end_no_second_session).format("YYYY-MM-DD");
      isBlocked = blockedDays.includes(moment(today1).format("YYYY-MM-DD"));
      // console.log(isBlocked);
      // console.log(
      //   moment(today1).format("YYYY-MM-DD"),
      //   moment(settings[0].start_no_second_session).format("YYYY-MM-DD")
      // );

      if (!isBlocked) {
        //check holidays -- not in the holidays --> push it
        if (
          dHolidays.find((element) => element == formDate(today1)) == undefined
        ) {
          arrSked.push(formDate(today1));
          ctr++;
        }
      }
    } while (ctr < numCards);

    return arrSked; //proof that we can return a value from async/await construct: 14-Dec-20
  },

  getBooking: (dDate, cSession) => {
    return new Promise((resolve, reject) => {
      resolve(
        Sked.countDocuments({
          $and: [
            { date_attend: { $eq: new Date(dDate) } },
            { session: { $eq: cSession } },
            { train_type: { $eq: 1 } },
          ],
        }).exec()
      );
    });
  },

  getTraining: (t_avail) => {
    return new Promise((resolve, reject) => {
      const md1 = moment().format("YYYY-MM-DDT00:00:00.000") + "Z";
      updtTraining(t_avail); //defined locally --> see upper section
      resolve(
        Training.find({
          $and: [
            { train_date: { $gt: md1 } },
            {
              $or: [
                { train_avail: { $eq: t_avail } },
                { train_avail: { $eq: "Both" } },
              ],
            },
          ],
        }).sort({ train_date: 1 })
      );
    });
  },

  getGenSkedList: () => {
    return new Promise((resolve, reject) => {
      const md1 = moment().format("YYYY-MM-DDT00:00:00.000") + "Z";
      updtGenSked(); //defined locally --> see upper section
      resolve(
        GenSked.find({ gensked_date: { $gt: md1 } }).sort({ gensked_date: 1 })
      );
    });
  },

  skedCount: (train_type) => {
    return new Promise((resolve, reject) => {
      resolve(
        Sked.countDocuments({
          $and: [
            { date_attend: { $gte: new Date() } },
            { train_type: { $eq: train_type } },
          ],
        }).exec()
      );
    });
  },
  liveBooking: (train_type) => {
    return new Promise((resolve, reject) => {
      resolve(
        Sked.find({
          $and: [
            { lastname: { $eq: "lastname" } },
            { train_type: { $eq: train_type } },
          ],
        }).exec()
      );
    });
  },
}; //module.exports
