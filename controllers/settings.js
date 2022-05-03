const Setting = require("../models/settings");
const package = require("../package.json"); //added: 13-Mar-22

exports.get_settings = async function (req, res) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }

  const settings = await Setting.find({});

  console.log(
    settings[0].start_no_second_session,
    settings[0].end_no_second_session,
    settings[0].max_pax,
    settings[0].banner_text,
    settings[0].covid_remarks,
    settings[0].board_msg
  );
  res.render("settings", {
    userlevel: req.session.level,
    errmsg: "",
    settings,
    username: req.session.username,
    email: req.session.email,
    version: package.version,
  });
};

exports.post_settings = async function (req, res) {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }
  //console.log(req.body.start_no_second_session);
  //console.log(req.body.end_no_second_session);
  // console.log("Contents of req.body", req.body);
  const hasOneRecord = await Setting.find({});
  //console.log(hasOneRecord);
  if (
    hasOneRecord === null ||
    hasOneRecord === undefined ||
    hasOneRecord.length === 0
  ) {
    //console.log("no record");
    // console.log(req.body);

    const setting = new Setting({
      // start_no_second_session: req.body.start_no_second_session,
      // end_no_second_session: req.body.end_no_second_session,
      max_pax: req.body.max_pax,
      banner_text: req.body.banner_text,
      no_session_days: req.body.no_session_days,
      covid_remarks: req.body.covid_remarks,
      board_msg: req.body.board_msg,
    });

    setting.save(function (err) {
      if (err) {
        return next(err);
      }
    });
  } else {
    console.log("has a record");
    console.log(req.body);
    await Setting.updateOne(
      {},
      {
        // start_no_second_session: req.body.start_no_second_session,
        // end_no_second_session: req.body.end_no_second_session,
        max_pax: req.body.max_pax,
        banner_text: req.body.banner_text,
        no_session_days: req.body.no_session_days,
        covid_remarks: req.body.covid_remarks,
        board_msg: req.body.board_msg,
      }
    );
  }
  res.redirect("/home");
};
