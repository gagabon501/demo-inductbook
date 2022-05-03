const appLogger = require("./logger"); //using winston --> added: 04-Dec-21
const moment = require("moment");
const dotenv = require("dotenv");
const Setting = require("../models/settings");

const {
  getSettings,
  getSkeds,
  getBooking,
  formatDate,
  getTraining,
  getGenSkedList,
  skedCount,
  liveBooking,
} = require("../helpers/gaglib"); //Own lib added: 19-Jan-21

dotenv.load(); //load environment variables

//ROUTE FOR THE CONSTANT UPDATES OF THE DASHBOARD
//router.get("/getskedupdate", dashboard.get_sked_data);
exports.get_sked_data = function (req, res, next) {
  if (!req.session.userId) {
    const err = new Error("Not authorized! Go back!");
    err.status = 400;
    return res.redirect("/logout");
  }
  const now = moment(new Date());
  const duration = moment.duration(now.diff(req.session.login_date_time));
  const hours = duration.asHours();
  console.log("time difference: ", hours);

  //added 24-Dec-21 due to some users staying in the system but not doing anything while the system keeps on executing /getskedupdate
  // if (hours > 0.016 && req.session.level < 2) {
  // > 1 minute (1/60)
  if (hours > 2 && req.session.level < 2) {
    appLogger.error(`${req.session.email} booted out due to inactivity`);
    return res.redirect("logout");
  }
  updateBookingSked(req, res); //uses async/await
};

const updateBookingSked = async (req, res) => {
  let arrSkeds = [];
  let tit_sess1 = [];
  let tit_sess2 = [];
  let aIsNew = [];
  let aTitleColor = [];
  let arrBooking = [];

  arrSkeds = await getSkeds(parseInt(process.env.NUMDAYS)); //make this as flexible via environment variables - NUMBER OF DAYS TO DISPLAY in the Induction Dashboard

  const settings = await getSettings();

  const ongoingBooking = await liveBooking(1);

  console.log("Live booking list: ", ongoingBooking);
  console.log("Booking source: ", req.session.email);
  // console.log("Live booking count: ", ongoingBooking.length); //still to be shown on client-side: 18-Nov-21

  for (let i = 0; i < arrSkeds.length; i++) {
    let booking1 = await getBooking(arrSkeds[i], "1");
    let booking2 = await getBooking(arrSkeds[i], "2");

    let noSecondSession = false;

    booking_date = arrSkeds[i];
    // console.log(booking_date);
    noSecondSession =
      moment(booking_date).format("YYYY-MM-DD") >=
        moment(settings[0].start_no_second_session).format("YYYY-MM-DD") &&
      moment(booking_date).format("YYYY-MM-DD") <=
        moment(settings[0].end_no_second_session).format("YYYY-MM-DD");

    // console.log(noSecondSession);

    // booking_num1 = settings[0].max_pax - booking1; //Removed: 22-June-2021 --> to utilise noSecondSession variable that stands for no session days
    // booking_num2 = noSecondSession ? 0 : settings[0].max_pax - booking2; //updated: 22-Dec-20 as per Vanessa's F advise

    //NOTE: 22-June-2021 --> noSecondSession variables from settings will hold the value for the entire day - NO SESSION DAYS --> This is to addres
    // Tanja's concern about blocking certain days.

    //currently, FCC is now only doing one session per day, hence th noSecondSession variable holds for the DAYS WITH NO SESSIONS--> 22-June-2021
    // booking_num1 = noSecondSession ? 0 : settings[0].max_pax - booking1;

    booking_num1 = settings[0].max_pax - booking1; //restored since the blocking of days is generated in gaglib.js/getSkeds()
    booking_num2 = 0;

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
      booking1,
      booking2,
    });
  }

  const t_avail =
    req.session.company_type === "Internal" ? "Internal" : "External";

  const trainings = await getTraining(t_avail);
  const genskeds = await getGenSkedList();

  const totInductions = await skedCount(1); //re-factored: 15-Feb-21
  const totTrainings = await skedCount(2);
  const totGenSkeds = await skedCount(3);

  let t = new Date();
  let labels = [];
  let inductDataSet = [];
  let book1 = 0;
  let book2 = 0;
  for (let i = 0; i < 9; i++) {
    labels.push(formatDate(t));

    book1 = await getBooking(formatDate(t), "1");
    book2 = await getBooking(formatDate(t), "2");

    inductDataSet.push(book1 + book2);
    t.setDate(t.getDate() + 1);
  }

  res.json({
    avail_date: arrBooking,
    files: trainings,
    genskeds,
    labels,
    inductDataSet,
    totInductions,
    totTrainings,
    totGenSkeds,
    ongoingBooking,
  });
};
