var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Chat = require('../models/chat.js');
var Promise = require('bluebird');

router.get('/:friend_id', function(req, res) {
  var userID = req.user._id;
  var friendID = req.params.friend_id;
  
  Promise.all([
    User.findById(friendID, {username: 1}),
    Chat.find({
          from: { $in: [userID, friendID] }
        , to: { $in: [userID, friendID] }
      })
      .limit(20)
      .sort({ _id: -1 })
  ])
  .then(function(results) {
    res.render('./layouts/chatbox', { friend: results[0], messages: results[1] });
  });
});

module.exports = router;
