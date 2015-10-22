var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new mongoose.Schema( {
    username: String
  , email: String
  , password: String
  , chips: Number
  , largestWin: Number
  , handsPlayed: Number
  , chipTracker: [{change: Number, date: Date}]
  , resetPasswordToken: String
  , resetPasswordExpires: Date
  , friends: [{ _id: { type: Schema.Types.ObjectId, ref: '' }, status: String }]
});

// userSchema.pre('save', function(next) {
//   this.created_at = new Date();
//   next();
// });

userSchema.methods.validPassword = function(password) {
  return this.password == password;
}

var user = mongoose.model('User', userSchema);

module.exports = user;
