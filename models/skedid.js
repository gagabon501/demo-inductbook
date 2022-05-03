var mongoose = require('mongoose');
var moment = require('moment'); // For date handling.

//var Schema = mongoose.Schema;
var SkedIdSchema = new mongoose.Schema({
    _id: {type: String, required: true},
    sequence: {type: Number}
});


// Export model.
module.exports = mongoose.model('SkedId', SkedIdSchema);
