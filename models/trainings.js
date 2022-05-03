var mongoose = require('mongoose');
var moment = require('moment'); // For date handling.
const AutoIncrement = require('mongoose-sequence')(mongoose);

//var Schema = mongoose.Schema;
//Note 01-Feb-19: When adding a new field, you must maintain the comma (,) on the last field (userid), otherwise, the new fields will not be added
var TrainSchema = new mongoose.Schema({
    train_title: {type: String, max: 100},
    train_date: {type: Date},
    train_session1: {type: String},
    train_session2: {type: String},
    train_venue: {type: String},
    train_pax: { type: Number },
    train_tot_session1: { type: Number },
    train_tot_session2: { type: Number },
    train_avail: {type: String},
});

 // Virtual for Booking URL
TrainSchema
.virtual('url')
.get(function () {
  return this._id;
});

module.exports = mongoose.model('Train', TrainSchema);
