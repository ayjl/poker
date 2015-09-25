var mongoose = require("mongoose");

var userSchema = new mongoose.Schema( {
    name: String
  , created_at    : { type: Date }
});

userSchema.pre('save', function(next) {
  this.created_at = new Date();
  next();
});

var user = mongoose.model('User', userSchema);

module.exports = user;