var mongoose = require("mongoose");

var userSchema = new mongoose.Schema( {
    username: String
  , email: String
  , password: String
  , chipCount: Number
  // , created_at    : { type: Date }
});

// userSchema.pre('save', function(next) {
//   this.created_at = new Date();
//   next();
// });

var user = mongoose.model('User', userSchema);

module.exports = user;