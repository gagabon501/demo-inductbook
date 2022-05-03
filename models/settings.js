var mongoose = require("mongoose");

var SettingsSchema = new mongoose.Schema({
  start_no_second_session: { type: String },
  end_no_second_session: { type: String },
  max_pax: { type: Number, default: 15 },
  banner_text: { type: String, default: "" },
  no_session_days: { type: String },
  covid_remarks: { type: String },
  board_msg: { type: String },
});

module.exports = mongoose.model("Setting", SettingsSchema);
