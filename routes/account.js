var express = require('express');
var router = express.Router();
var config = require('config');
var Promise = require('bluebird');
var User = require('../models/user.js');
var Session = require('../models/session.js');
var moment = require('moment');

router.get('/', function(req, res) {
  new Promise(function(resolve, reject) {
    if(req.isAuthenticated()) {
      User.findById(req.user.id)
      .populate({
          path: 'friends._id'
        , select: 'username'
      }).then(function(user) {
        resolve(user);
      });
    }
    else {
      resolve(req.session.user);
    }
  })
  .then(function(user) {
    if(req.isAuthenticated()) {
      res.locals.friends = [];
      res.locals.incomingFriends = [];

      for(var i=0; i<user.friends.length; i++) {
        if(user.friends[i].status == 'accepted') {
          res.locals.friends.push(user.friends[i]);
        }
        else if(user.friends[i].status == 'incoming') {
          res.locals.incomingFriends.push(user.friends[i]);
        }
      }
      res.locals.hands = [];
      for (var i = 0; i < user.handHistory.length; i++){
        var hist = user.handHistory[i];
        hist.when = moment(hist._id.getTimestamp()).format('ddd DD MMM HH:mm');
        res.locals.hands.unshift(hist);
      }
    
      User.count({ chips: { $gt: user.chips} })
      .then(function(ranking) {
        res.render('account', {
            isYou: true, profile: user
          , ranking: ranking+1
          , chipTracker: JSON.stringify(user.chipTracker)
        });
      });
    }
    else {
      res.render('account', {
          isYou: true, profile: user
      });
    }
  });
});

router.post('/topup-chips', function(req, res, next) {
  if(req.isAuthenticated()) {
    if(req.user.chips < 3000) {
      User.findByIdAndUpdate(req.user.id, { $set: { chips: 3000 } }, { new: true })
      .then(function(user) {
        return res.json({chips: user.chips});
      });
    }
  }
  else {
    if (req.session.user.chips < 3000) {
      req.session.user.chips = 3000;
    }
    return res.json({chips: req.session.user.chips});
  }
});

router.post('/friend', function(req, res, next) {
  if(!req.isAuthenticated()) {
    return res.sendStatus(401);
  }

  var friendID = req.body.friendID;

  switch(req.body.action) {
    case 'add':
      User.update(
          { _id: friendID}
        , { $pull : { 'friends': { _id: req.user.id, status: 'ignored' } } }
      ).then(function() {
        User.update(
            { _id: req.user.id, 'friends._id': { $ne: friendID } }
          , { $push : { 'friends': { _id: friendID, status: 'outgoing' } } }
        ).exec();

        User.update(
            { _id: friendID, 'friends._id': { $ne: req.user.id } }
          , { $push : { 'friends': { _id: req.user.id, status: 'incoming' } } }
        ).exec();
      });
      break;
    case 'accept':
      User.update(
        {
          _id: req.user.id
          , 'friends._id': friendID
          , 'friends.status': { $in: ['incoming', 'ignored', 'blocked'] }
        }
        , { $set : { 'friends.$.status': 'accepted' } }
      ).exec();

      User.update(
          { _id: friendID, 'friends._id': req.user.id, 'friends.status': 'outgoing' }
        , { $set : { 'friends.$.status': 'accepted' } }
      ).exec();
      break;
    case 'ignore':
      User.update(
        {
          _id: req.user.id
          , 'friends._id': friendID
          , 'friends.status': { $in: ['incoming', 'blocked'] }
        }
        , { $set : { 'friends.$.status': 'ignored' } }
      ).exec();
      break;
    case 'block':
      User.update(
        {
          _id: req.user.id
          , 'friends._id': friendID
          , 'friends.status': { $in: ['incoming', 'ignored'] }
        }
        , { $set : { 'friends.$.status': 'blocked' } }
      ).exec();
      break;
    case 'unfriend':
    case 'cancel':
      User.update(
          { _id: req.user.id }
        , { $pull : { 'friends': { _id: friendID } } }
      ).exec();

      User.update(
          { _id: friendID }
        , { $pull : { 'friends': { _id: req.user.id } } }
      ).exec();
      break;
  }

  return res.sendStatus(200);
});

module.exports = router;
