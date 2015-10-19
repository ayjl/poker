var express = require('express');
var router = express.Router();
var config = require('config');
var Promise = require('bluebird');
var User = require('../models/user.js');
var Session = require('../models/session.js');

router.get('/', function(req, res) {
  new Promise(function(resolve, reject) {
    if(req.isAuthenticated()) {
      User.findById(req.user.id)
      .then(function(user) {
        resolve(user);
      });
    }
    else {
      resolve(req.session.user);
    }
  })
  .then(function(user) {
    res.render('account', { isYou: true, profile: user , chipTracker: JSON.stringify(user.chipTracker)});
  });
});

router.post('/topup-chips', function(req, res, next) {
  if(req.isAuthenticated()) {
    if(req.user.chips < 2000) {
      User.findByIdAndUpdate(req.user.id, { $set: { chips: 2000 } }, { new: true })
      .then(function(user) {
        return res.json({chips: user.chips});
      });
    }
  }
  else {
    if (req.session.user.chips < 2000) {
      req.session.user.chips = 2000;
    }
    return res.json({chips: req.session.user.chips});
  }
});

router.post('/add-friend', function(req, res, next) {
  if(!req.isAuthenticated()) {
    return res.sendStatus(401);
  }

  var friendID = req.body.friendID;

  User.update(
      { _id: req.user.id }
    , { $addToSet : { 'friends.outgoing': friendID } }
  ).exec();

  User.update(
      { _id: friendID }
    , { $addToSet : { 'friends.incoming': req.user.id } }
  ).exec();

  return res.sendStatus(200);
});

module.exports = router;
