var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var UserSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  company_type: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  passwordConf: {
    type: String,
    required: false,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  level: {
    type: Number,
    required: true,
  },
});

UserSchema
.virtual('url')
.get(function () {
  return '/user_update/'+this._id;
});

//authenticate input against database
UserSchema.statics.authenticate = function (email, password, callback) {
  User.findOne({ email: email })
    .exec(function (err, user) {
      if (err) {
        return callback(err)
      } else if (!user) {
        var err = new Error('User not found.');
        err.status = 401;
        console.log(err)
        return callback(err);
      }
      bcrypt.compare(password, user.password, function (err, result) {
        if (result === true) {
          return callback(null, user);
        } else {
          return callback();
        }
      })
    });
}

UserSchema.pre('save', function(next){
    var user = this;
    if (!user.isModified('password')) return next();

    bcrypt.genSalt(10, function(err, salt){
        if(err) return next(err);

        bcrypt.hash(user.password, salt, function(err, hash){
            if(err) return next(err);

            user.password = hash;
            next();
        });
    });
});

//hashing a password before saving it to the database
//UserSchema.pre('save', function (next) {
//  var user = this;
//  bcrypt.hash(user.password, 10, function (err, hash) {
//    if (err) {
//      return next(err);
//    }
//    user.password = hash;
//    next();
//  })
//});


var User = mongoose.model('User', UserSchema);
module.exports = User;
