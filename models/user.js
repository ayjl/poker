var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new mongoose.Schema( {
    username: String
  , email: String
  , password: String
  , chips: { type: Number, default: 2000 }
  , largestWin: { type: Number, default: 0 }
  , handsPlayed: { type: Number, default: 0 }
  , chipTracker: [{change: Number, date: Date}]
  , resetPasswordToken: { type: String, default: '' }
  , resetPasswordExpires: { type: Date, default: Date.now }
  , handHistory: [{
      hand: { name: String, cards: [String] }
    , community: [String]
    , profit: Number
    , winningHand: { name: String, cards: [String] }
    }]
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
