var mongoose = require("mongoose");

var sessionSchema = new mongoose.Schema( {
  _id: String,
  session: String
});

var session = mongoose.model('Session', sessionSchema);

module.exports = session;
