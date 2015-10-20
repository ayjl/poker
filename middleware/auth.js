var User = require('../models/user.js');
var Chat = require('../models/chat.js');
var Promise = require('bluebird');

module.exports = function(req, res, next) {
  if(!req.session.user) {
    var num = Math.floor((Math.random() * 100000) + 1).toString();
    var pad = '000000';
    var padded = pad.substring(0, pad.length - num.length) + num;

    req.session.user = {};
    req.session.user.username = 'Guest' + padded;
    req.session.user.chips = 2000;
    req.session.loggedIn = false;
  }

  res.locals.query = req.query;

  if(req.isAuthenticated()) {
    req.session.loggedIn = true;
    res.locals.user = req.user;
    res.locals.openChats = [];
    var openChats = onlineUsers.getOpenChats(req.user.id);

    var userID = req.user;
    for(var i=0; i<openChats.length; i++) {
      var friendID = openChats[i];
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
        res.locals.openChats.push({ friend: results[0], messages: results[1] });
      });
    }
  }
  else {
    res.locals.user = req.session.user;
  }
  res.locals.loggedIn = req.isAuthenticated();

  next();
};
