var mongoose = require('mongoose');
var moment = require('moment'); // For date handling.
const AutoIncrement = require('mongoose-sequence')(mongoose);
var ssFileName = "gilberto" //global filename

//var Schema = mongoose.Schema;
//Note 01-Feb-19: When adding a new field, you must maintain the comma (,) on the last field (userid), otherwise, the new fields will not be added
var SkedSchema = new mongoose.Schema({
    company: {type: String, required: true, max: 100},
    date_attend: {type: Date},
    lastname: {type: String},
    firstname: {type: String},
    phone: {type: String},
    company: {type: String},
    sitesafe: {type: String},
    expiry: {type: Date},
    ss_photo_filename: {type: String},
    bookdate: {type: Date},
    bookedby: {type: String},
    session: {type: String},
    session_title: {type: String},
    emergency_person: {type: String},
    emergency_phone: {type: String},
    userid: { type: String },
    train_id: { type: String },
    train_type: { type: Number },
    
});

// Virtual for Booking URL
SkedSchema
.virtual('url')
.get(function () {
  return this._id;
});

SkedSchema
.virtual('d_attend_dd_mm_yyyy')
.get(function () {
  return moment(this.date_attend).format('DD-MM-YYYY');
});

SkedSchema
  .virtual('d_expiry_dd_mm_yyyy')
  .get(function () {
    return moment(this.expiry).format('DD-MM-YYYY');
});

// Export model.
//SkedSchema.plugin(AutoIncrement, {inc_field: 'id'});
module.exports = mongoose.model('Sked', SkedSchema);
