const appLogger = require("../controllers/logger"); //using winston --> added: 04-Dec-21
const Sked = require("../models/sked");
const User = require("../models/user");

const ExcelJS = require("exceljs");
const moment = require("moment");
const dotenv = require("dotenv");
dotenv.load();

const got = require("got");
const nodemailer = require("nodemailer");

const getInductionList = (dateval) => {
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
            {},
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

async function genExcel(colHeaders, dataLists, filename) {
  //   console.log("Hey, Im called!");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  let row = 0;
  let currRow = "";
  ws.columns = colHeaders;
  regex = /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i; //regex to validate images --> 14-Nov-21

  //stuffing of data on each row
  dataLists.forEach((data) => {
    ws.addRow(data); //stuff data on each row

    currRow = ws.lastRow; //get the current row
    currRow.height = 150; //adjust row heiht

    ws.getCell(`B${row + 2}`).value = null;
    ws.getCell(`I${row + 2}`).value = null;
    row++;
  });

  const ext = { width: 200, height: 200 };

  await insertImg2excel(wb, ws, dataLists, 1, ext);
  await insertImg2excel(wb, ws, dataLists, 8, ext);

  //   return wb.xlsx.writeBuffer(); //this is now being processed at the calling end --> returns a buffer --> 23-Nov-21 --> client-side implementation
  await wb.xlsx.writeFile(filename).then(async () => {
    const admins = await getEmailRecipients();
    let emails = [];
    let subject = "";
    let emailbody = "see attachment";

    admins.forEach((admin) => {
      emails.push(admin.email);
    });

    // emails = ["gagabon@safenode.co.nz"]; //remove after test
    subject = "List of Attendees for EHS Induction";
    emailFile(emails, subject, emailbody, filename); //located at the top of this file
  });
}

async function insertImg2excel(wb, ws, data, col, ext) {
  //=================================================================================================================================================================
  // REMEMBER THIS: On functions or routines that are asynchronous, i.e. file I/O, network access, or other processes that take time, the trick into ensuring that the
  // routines produce the data correctly when they are called inside a LOOPING routine is to STORE those PROMISES into an ARRAY and do a FINAL RESOLVE at the end once
  // the looping is DONE. E.g.:  "await Promise.all(promises)"
  //================================================================================================================================================================

  //Store all promises first into an array --> the 'promises' variable here defined will store the result of the 'data.map()' function. data.map() is a LOOPING function
  const promises = data.map(async (d, i) => {
    const url = d[col]; //this is the URL of the image to be inserted in the Excel sheet
    if (!url) {
      return;
    }
    const ret = await got.stream(url); //this is a big help. got() is used here to stream the image data based on the passed url and return the streamed data (buffer) --> using promises
    const imgId = wb.addImage({
      buffer: ret, //the data from got.stream() is now passed as a buffer to wb.addImage() --> 30-Nov-21
      extension: "png",
    });

    //this 'ws' object is the object passed from the calling function. This object was crafted from that function and passed onto here
    ws.addImage(imgId, {
      tl: { col: col, row: i + 1 }, // top left
      ext: ext,
    });
  });

  await Promise.all(promises); //FINAL RESOLVE HERE for all the PROMISES STORED IN THE ARRAY --> 24-Nov-21
}

module.exports = {
  export2Excel: async (dateRange) => {
    //   const baseUrl= location.protocol +"//"+location.host+"/image/" //--> client side implementation

    const baseUrl =
      process.env.DEVELOPMENT == "1"
        ? "http://localhost:5000/" + "image/"
        : "https://inductbook.safenode.co.nz/" + "image/";
    let num = 1;
    // console.log("baseUrl: ", baseUrl);
    const sked = await getInductionList(dateRange); //see upper section - this function is inside this file --> dateRange is passed from the initiating function (i.e. in cronjobs())
    if (sked.length === 0) {
      // console.log("Empty INDUCTION attendees. Aborting..");
      appLogger.info("Empty INDUCTION attendees. Aborting..");
      return false;
    }
    const dataLists = sked.map((user) => {
      //returned array must align with the colHeaders
      return [
        num++,
        baseUrl + user.headshot,
        user.firstname,
        user.lastname,
        user.phone,
        user.company,
        user.sitesafe,
        moment(user.expiry).format("DD-MM-YYYY"),
        baseUrl + user.ss_photo_filename,
        user.constructsafe,
        moment(user.date_attend).format("DD-MM-YYYY"),
        user.session_title,
        moment(user.bookdate).format("DD-MM-YYYY"),
        user.bookedby,
        user.emergency_person,
        user.emergency_phone,
        user.fcc_supervisor,
        user.workpack,
        user.company_supervisor,
        user.first_tier,
      ];
    });

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

      // header: "Booked By",
      {
        header: "Booked and Vaccine Confirmed By",
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

    genExcel(colHeaders, dataLists, "ListAttendees.xlsx").then((value) => {
      // console.log(value);
    });
  },
};
