const dotenv = require("dotenv");

const _ = require("lodash");
const moment = require("moment");
const Billing = require("../models/billing");
const appLogger = require("./logger"); //using winston --> added: 04-Dec-21
const { sendBillMail } = require("../helpers/gaglib"); //Own lib added: 19-Jan-21

const fs = require("fs");
const pdf = require("html-pdf");
const html = fs.readFileSync("./views/billingForm.ejs", "utf8");
const options = {
  orientation: "portrait",
  format: "A4",
};

dotenv.load(); //load environment variables

exports.dobill_get = async function (req, res) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  if (req.session.level < 5) {
    res.redirect("/home");
  }

  const period = moment().subtract(1, "months").format("MMMM YYYY"); //get the previous month's
  console.log(period);
  const newInvoice = new Billing({
    inv_period: period,
  });
  const newInv = await newInvoice.save();
  console.log(newInv);

  res.render(
    "billingForm",
    {
      userlevel: req.session.level,
      username: req.session.username,
      email: req.session.email,
      inv_no: "NS-INV-" + _.padStart(newInv.inv_no.toString(), 3, "0"),
      inv_date: moment(newInv.inv_date).format("DD-MMM-YYYY"),
      inv_period: period,
      id: newInv._id,
    },
    (err, html) => {
      const pdfFileName =
        "NS-INV-" + _.padStart(newInv.inv_no.toString(), 3, "0") + ".pdf";
      pdf.create(html, options).toFile("./" + pdfFileName, function (err, res) {
        if (err) return console.log(err);
        console.log(res);
        // const uri =
        //   process.env.DEVELOPMENT == "1"
        //     ? "mongodb://127.0.0.1:27017"
        //     : process.env.MONGODB_URI;
        // const recvr =
        //   process.env.DEVELOPMENT == "1"
        //     ? ["gagabon@safenode.co.nz"]
        //     : ["ariannak@fcc.co.nz", "ap.fccnz@fbu.com"];
        const recvr = ["gagabon@safenode.co.nz"]; //remove after test
        const subject = `Booking System Maintenance Invoice for ${period} (${pdfFileName})`;
        const emaildata = {
          inv_no: pdfFileName,
          period: period,
          id: newInv._id,
        };

        sendBillMail(recvr, subject, emaildata, pdfFileName);
        // req.flash("success", `Billing email sent to: ${recvr}`); //no point doing this as the redirect goes to /home and the screen is refreshed by the dashboard
        appLogger.info(
          `Bill sent on: ${moment().format("YYYY-MM-DD @ HH:MM:SS")}`
        );
      });

      res.redirect("/home");
    }
  );
};
