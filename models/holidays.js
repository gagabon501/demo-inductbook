var mongoose = require('mongoose');
var moment = require('moment'); // For date handling.

//Note 01-Feb-19: When adding a new field, you must maintain the comma (,) on the last field (userid), otherwise, the new fields will not be added
var HolidaySchema = new mongoose.Schema({
    date_holiday: {type: Date},
    holiday_name: {type: String, required: true, max: 30},
    short_name: { type: String, required: true, max: 10 },
    train_type: { type: Number},
});

// Virtual for Booking URL
HolidaySchema
.virtual('url')
.get(function () {
  return this._id;
});

module.exports = mongoose.model('Holidays', HolidaySchema);
