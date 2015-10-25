var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');

router.get('/', function(req, res, next) {
  if(!req.isAuthenticated()) {
    return res.redirect('/');
  }

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

    User.count({ _id: { $ne: req.user.id }, email: data.email })
    .then(function(emailCount) {
      if (emailCount > 0) {
        errors.push({
            name: 'email'
          , message: 'That email is in use'
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
    });
  }
  else if (data.password) {
    if(data.password.length < 6) {
      errors.push({
          name: 'password'
        , message: 'A password of at least 6 characters is required'
      });
    }

    User.count({ _id: req.user.id, password: data.old_password })
    .then(function(count) {
    console.log('count ' , count);
      if(count == 0) {
        errors.push({
            name: 'password'
          , message: 'The current password you provided is incorrect'
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
    });
  } else {
    return;
  }
});

router.get('/check-email', function(req, res, next) {
  var errors = [];

  if(!isEmail(req.query.value)) {
    errors.push({
        name: 'email'
      , message: 'A valid email is required'
    });
    return res.json({ errors: errors });
  }

  User.count({ _id: { $ne: req.user.id }, email: req.query.value })
  .then(function(emailCount) {
    if (emailCount > 0) {
      errors.push({
          name: 'email'
        , message: 'That email is in use'
      });
    }
    res.json({ errors: errors });
  })
});

function isEmail(email) {
  var regex = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;

  return regex.test(email);
}

module.exports = router;
