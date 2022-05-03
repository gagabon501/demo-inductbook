require("express-async-errors");
const express = require("express");
const robots = require("express-robots-txt"); //added: 23-Dec-21 as site was being indexed by webcrawlers --> dont want this
const moment = require("moment");
const _ = require("lodash");

const accessLogger = require("morgan");
const rfs = require("rotating-file-stream"); // version 2.x
const appLogger = require("./controllers/logger"); //using winston
const error = require("./middleware/error");

const bodyParser = require("body-parser");
const path = require("path");
const mongoose = require("mongoose");
const createError = require("http-errors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

const session = require("express-session");
const MongoStore = require("connect-mongo")(session);

const flash = require("req-flash");
// const flash = require("connect-flash");

const app = express();

app.use(
  robots({
    UserAgent: "*",
    Disallow: "/",
  })
);

// Middleware
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(urlencoded({ extended: true }));
// express.urlencoded({ extended: true });

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// create a rotating write stream
var accessLogStream = rfs.createStream("access.log", {
  interval: "1d", // rotate daily
  path: path.join(__dirname, "server/access/"),
});

// setup the logger - access logger 'morgan'
// "Pacific/Auckland"

accessLogger.token("date", (req, res, tz) => {
  return moment().tz(tz).format("DD-MMM-YYYY @ HH:mm:ss");
});

accessLogger.token("pid", (req, res) => {
  return req.session ? req.session.email : "Guest";
});

// const formatString =
//   "[:date[Pacific/Auckland]] ':method :url' :pid :status :referrer :remote-addr :remote-user :user-agent :req[header]";

const formatString =
  "[:date[Pacific/Auckland]] ':method :url' :pid :status :remote-addr :req[header] :user-agent";

accessLogger.format("myformat", formatString);

//Removed temporarily: 26-Apr-22
// app.use(
//   accessLogger("myformat", {
//     stream: accessLogStream,
//     skip: (req, res) => {
//       return (
//         req.url === "/getskedupdate" ||
//         req.url === "/getlogs/show" ||
//         req.url === "/getlogs/access"
//       );
//     },
//   })
// );

app.locals.moment = require("moment"); //this is to allow the use of moment inside the EJS template (client-side)

dotenv.load();

const homeRouter = require("./routes/router");

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

const connection = mongoose.connection;
connection.once("open", () => {
  console.log(
    `MongoDB database connection established successfully with ${
      uri.includes("127.0.0.1") ? "LOCALHOST" : "REMOTE SERVER @ MongoDB.com"
    }`
  );
});

//use sessions for tracking logins
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: connection,
    }),
  })
);

app.use(flash());

app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

//Forced HTTPS: 18-June-21
app.use((req, res, next) => {
  if (process.env.DEVELOPMENT === "0") {
    if (req.headers.host === "inductbook.herokuapp.com")
      return res.redirect(301, "https://inductbook.safenode.co.nz/");
    if (req.headers["x-forwarded-proto"] !== "https")
      return res.redirect("https://" + req.headers.host + req.url);
    else return next();
  } else {
    return next();
  }
});

app.use("/", homeRouter);

// catch 404 and forward to error handler
// app.use("*", function (req, res, next) {
//   // next(createError(404));
//   // console.log(req);
//   appLogger.error(
//     `404 - NOT FOUND: baseUrl: ${req.baseUrl} : originalUrl: ${req.originalUrl} : user: [${req.session.email}, ${req.session.username}, ${req.session.company}]`
//   );
//   res.status(404).render("404");

//   next();
// });

//error handler middleware - should be the last to be called among all middlewares
// app.use(error);
module.exports = app;
