var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');

router.get('/:user_id', function(req, res) {
  var userID = req.params.user_id;
  
  if(req.isAuthenticated() && userID == req.user.id) {
    return res.redirect('/account');
  }

  User.findById(userID)
  .then(function(user) {
    var relationship;
    if(user.friends.accepted.indexOf(req.user.id) != -1) {
      relationship = 'Friends';
    }
    else if(user.friends.outgoing.indexOf(req.user.id) != -1) {
      relationship = 'Pending approval';
    }
    else if(user.friends.incoming.indexOf(req.user.id) != -1) {
      relationship = 'Added you';
    }

    res.render('account', { isYou: false, profile: user, relationship: relationship });
  });
});

module.exports = router;
