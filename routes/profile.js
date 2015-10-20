var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');

router.get('/:user_id', function(req, res) {
  var userID = req.params.user_id;

  if(req.isAuthenticated() && userID == req.user.id) {
    return res.redirect('/account');
  }

  User.findById(userID).then(function(user) {
    var relationship = user.friends.filter(function(friend) {
      return friend._id == req.user.id;
    });

    if(relationship.length == 1) {
      relationship = relationship[0].status;
      if(relationship == 'outgoing') {
        relationship = 'incoming';
      }
      else if(relationship == 'incoming') {
        relationship = 'outgoing';
      }
    }
    else {
      relationship = 'add';
    }
    User.count({ chips: { $gt: user.chips}
    })
    .then(function(ranking) {
      res.render('account', { isYou: false, profile: user, ranking: ranking+1, relationship: relationship });
  });


  });
});

module.exports = router;
