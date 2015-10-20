var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');

router.get('/', function(req, res, next) {
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
    res.render('settings', { isYou: true, profile: user});
  });
});

router.post('/', function(req, res, next) {
  var errors = [];
  var data = JSON.parse(req.body.data);
  if(data.email) {
    if(!isEmail(data.email)) {
      errors.push({
          name: 'email'
        , message: 'A valid email is required'
      });
    }

    if (errors.length == 0) {
      User.findByIdAndUpdate(req.user.id, { $set: { email: data.email } }, { new: true })
        .then(function(user) {
          return res.json({ errors: errors, email: user.email });
        });
    }
    else {
      return res.json({ errors: errors });
    }
  } else if (data.password) {
    if(data.password.length < 6) {
      errors.push({
          name: 'password'
        , message: 'A password of at least 6 characters is required'
      });
    }

    if (errors.length == 0) {
      User.findByIdAndUpdate(req.user.id, { $set: { password: data.password } }, { new: true })
        .then(function(user) {
          return res.json({ errors: errors });
        });
    }
    else {
      return res.json({ errors: errors });
    }
  } else {
    return;
  }
  
});

function isEmail(email) {
  var regex = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;

  return regex.test(email);
}

module.exports = router;
