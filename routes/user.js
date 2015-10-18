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
    res.render('account', { isYou: false, user: user });
  })
});

module.exports = router;
