var mongoose = require("mongoose");

var userSchema = new mongoose.Schema( {
    username: String
  , email: String
  , password: String
  , chips: Number
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