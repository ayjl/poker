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
  res.locals.path = req.path;

  res.locals.loggedIn = req.isAuthenticated();
  if(req.isAuthenticated()) {
    req.session.loggedIn = true;
    res.locals.user = req.user;
    res.locals.openChats = [];
    var openChats = onlineUsers.getOpenChats(req.user.id);
    res.locals.chatState = openChats.chatState;
    openChats = openChats.openChats;

    var userID = req.user;
    var promises = [];
    for(var i=0; i<openChats.length; i++) {
      var friendID = openChats[i].friendID;
      var state = openChats[i].state;

      promises.push(User.findById(friendID, {username: 1}));
      promises.push(Chat.find({
          from: { $in: [userID, friendID] }
        , to: { $in: [userID, friendID] }
      })
      .limit(20)
      .sort({ _id: -1 }));
    }
      
    Promise.all(promises)
    .then(function(results) {
      for(var i=0; i<results.length; i+=2) {
        res.locals.openChats.push({
            friend: results[i]
          , state: state
          , messages: results[i+1]
        });
      }
      next();
    });
  }
  else {
    res.locals.user = req.session.user;
    next();
  }
};
