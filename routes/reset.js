var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');

router.get('/:token', function(req, res, next) {
  User.findOne({resetPasswordToken: req.params.token})
  .then(function(user) {
    if (user && Date.now() < user.resetPasswordExpires) {
      return res.render('reset', {valid: true});
    }
    else {
      return res.render('reset', {valid: false});
    }
  });
});

router.post('/:token', function(req, res, next) {
  var errors = [];
  var data = JSON.parse(req.body.data);
  if(data.password.length < 6) {
    errors.push({
        name: 'password'
      , message: 'A password of at least 6 characters is required'
    });
  } else {
    User.findOne({resetPasswordToken: req.params.token})
    .then(function(user) {
      if (user && Date.now() < user.resetPasswordExpires) {
        user.password = data.password;
        user.resetPasswordToken = '';
        user.save().then(function(user) {
          req.login(user, function(err) {
            if(err) {
              return next(err);
            }
            return res.json({ errors: errors });
          });
        });
      }
      else {
        errors.push({
            name: 'password'
          , message: 'This password reset link is invalid or has expired.'
        });

        return res.json({ errors: errors });
      }
    });
  }
});

module.exports = router;
