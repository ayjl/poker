var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new mongoose.Schema( {
    username: String
  , email: String
  , password: String
  , chips: Number
  , chipTracker: [{change: Number, date: Date}]
  , friends: {
      accepted: [Schema.Types.ObjectId]
    , outgoing: [Schema.Types.ObjectId]
    , incoming: [Schema.Types.ObjectId]
  }
  // , created_at    : { type: Date }
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