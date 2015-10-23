var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var chatSchema = new mongoose.Schema( {
    from: Schema.Types.ObjectId
  , to: Schema.Types.ObjectId
  , message: String
});

var chat = mongoose.model('Chat', chatSchema);

module.exports = chat;
