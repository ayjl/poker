var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');

router.get('/:token', function(req, res, next) {
  User.findOne({resetPasswordToken: req.params.token})
  .then(function(user) {
    if (user && Date.now()< user.resetPasswordExpires) {
      return res.render('reset_valid', {profile: user});
    } else {
      return res.render('reset_invalid');
    }
  });
});

router.post('/', function(req, res, next) {
  var errors = [];
  var data = JSON.parse(req.body.data);
  if(data.password.length < 6) {
    errors.push({
        name: 'password'
      , message: 'A password of at least 6 characters is required'
    });
  } else {
    User.findOne({username: data.username})
    .then(function(user) {
      user.password = data.password;
      user.save().then(function(user) {
        req.login(user, function(err) {
          if(err) {
            return next(err);
          }
          res.json({ errors: errors });
        });
      });
    });
  }
  res.json({ errors: errors });
});

module.exports = router;
