var mongoose = require("mongoose");
var moment = require("moment"); // For date handling.
const AutoIncrement = require("mongoose-sequence")(mongoose);
var ssFileName = "gilberto"; //global filename

//var Schema = mongoose.Schema;
//Note 01-Feb-19: When adding a new field, you must maintain the comma (,) on the last field (userid), otherwise, the new fields will not be added
var SkedSchema = new mongoose.Schema({
  company: { type: String, required: true, max: 100 },
  date_attend: { type: Date },
  lastname: { type: String },
  firstname: { type: String },
  phone: { type: String },
  company: { type: String },
  sitesafe: { type: String },
  expiry: { type: Date },
  position: { type: String },
  lang1: { type: String },
  lang2: { type: String },
  ss_photo_filename: { type: String },
  headshot: { type: String },
  fcc_supervisor: { type: String },
  workpack: { type: String },
  company_supervisor: { type: String },
  first_tier: { type: String },
  constructsafe: { type: String },
  bookdate: { type: Date },
  bookedby: { type: String },
  session: { type: String },
  session_title: { type: String },
  emergency_person: { type: String },
  emergency_phone: { type: String },
  userid: { type: String },
  train_id: { type: String },
  train_type: { type: Number },
  train_title: { type: String, max: 100 },
  train_date: { type: Date },
  train_session1: { type: String },
  train_session2: { type: String },
  train_venue: { type: String },
  train_pax: { type: Number },
  train_avail: { type: String },
  vaccine_confirmed_by: { type: String }, //added: 26-Feb-22
});

// Virtual for Booking URL
SkedSchema.virtual("url").get(function () {
  return this._id;
});

// Export model.
//SkedSchema.plugin(AutoIncrement, {inc_field: 'id'});
module.exports = mongoose.model("Sked", SkedSchema);
