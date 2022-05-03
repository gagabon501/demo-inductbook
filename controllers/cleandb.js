exports.del_rec_get = (req, res) => {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  md = moment();

  res.render("delrec", {
    datenow: md.format("dddd Do MMM YYYY"),
    username: req.session.username,
    userlevel: req.session.level,
    company_type: req.session.company_type,
    runstage: process.env.DEVELOPMENT === "1" ? "DEVELOPMENT" : "PRODUCTION",
  });
};

exports.del_rec_post = (req, res, next) => {
  //console.log(req.body.dfrom);
  //console.log(req.body.dto);

  var dfrom = moment(req.body.dfrom).format("YYYY-MM-DDT00:00:00.000") + "Z"; //The "+Z"solved the issue of ensuring the equality comparison for GTE and LTE works: 01-Feb-2019
  var dto = moment(req.body.dto).format("YYYY-MM-DDT00:00:00.000") + "Z";

  if (req.session.level > 2) {
    Sked.find({ date_attend: { $gte: dfrom, $lte: dto } })
      .sort({ date_attend: 1, session: 1 })
      .exec(function (err, list_users) {
        if (err) {
          return next(err);
        }

        //console.log(JSON.stringify(list_users));

        if (JSON.stringify(list_users) !== "[]") {
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
  } //req.session.level > 2
  res.redirect("/home");
}; //exports.del_rec_post
