#! /usr/bin/env node

console.log('This script populates some permits to your database. Specified database as argument - e.g.: populatedb mongodb://your_username:your_password@your_dabase_url');

// Get arguments passed on command line
var userArgs = process.argv.slice(2);
if (!userArgs[0].startsWith('mongodb://')) {
    console.log('ERROR: You need to specify a valid mongodb URL as the first argument');
    return
}

var async = require('async')
var Ptw = require('./models/ptw')


var mongoose = require('mongoose');
var mongoDB = userArgs[0];
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
var db = mongoose.connection;
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

var ptws = []

function ptwCreate(ptw_type, work_description, work_location, issuer, receiver, d_issue, d_expiry, cb) {
  ptwdetail = {ptw_type:ptw_type , work_description: work_description, work_location: work_location, issuer: issuer, receiver: receiver }
  if (d_issue != false) ptwdetail.d_issue = d_issue
  if (d_expiry != false) ptwdetail.d_expiry = d_expiry

  var ptw = new Ptw(ptwdetail);

  ptw.save(function (err) {
    if (err) {
      cb(err, null)
      return
    }
    console.log('New Permit: ' + ptw);
    ptws.push(ptw)
    cb(null, ptw)
  }  );
}


function createPtws(cb) {
    async.parallel([
        function(callback) {
          ptwCreate('Hotwork', 'Welding', 'H1 Level', 'Gilberto Gabon', 'Tony Sayers', '2018-07-08', '2018-07-08', callback);
        },
        function(callback) {
          ptwCreate('Harness', 'Scaffolding', 'H8 Level', 'Joe Jacobs', 'Ian Summit', '2018-07-08', '2018-07-14', callback);
        },
        function(callback) {
          ptwCreate('Ladder', 'Lightings', 'H5 Level', 'Gilberto Gabon', 'Tom Coats', '2018-07-08', '2018-07-09', callback);
        },
        ],
        // optional callback
        cb);
}


async.series([
    createPtws
],
// Optional callback
function(err, results) {
    if (err) {
        console.log('FINAL ERR: '+err);
    }
    else {
        console.log('Hey: ');

    }
    // All done, disconnect from database
    mongoose.connection.close();
});
