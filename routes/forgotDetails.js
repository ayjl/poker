var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');

router.get('/', function(req, res, next) {
  res.render('forgotDetails');
});

router.post('/', function(req, res, next) {
  var errors = [];
  var data = JSON.parse(req.body.data);
  if(!isEmail(data.email)) {
    errors.push({
      name: 'email'
      , message: 'A valid email is required'
    });
  }

  User.count({email: data.email})
  .then(function(emailCount) {
    if (emailCount == 0) {
      errors.push({
        name: 'email'
        , message: 'That email is not in use'
      });
    } else {
      //send email here
    }
    res.json({ errors: errors });
  })
});

function isEmail(email) {
  var regex = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;

  return regex.test(email);
}

module.exports = router;
