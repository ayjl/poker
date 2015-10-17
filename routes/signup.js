var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');

router.get('/', function(req, res) {
  res.render('signup');
});

router.post('/', function(req, res, next) {
  var errors = [];
  var data = JSON.parse(req.body.data);

  if(data.username.length < 3) {
    errors.push({
        name: 'username'
      , message: 'A username of at least 3 characters is required'
    });
  }

  if(!isEmail(data.email)) {
    errors.push({
        name: 'email'
      , message: 'A valid email is required'
    });
  }

  if(data.password.length < 6) {
    errors.push({
        name: 'password'
      , message: 'A password of at least 6 characters is required'
    });
  }

  if (errors.length == 0) {
    var newUser = new User({ 
      username: data.username, 
      email: data.email, 
      password: data.password, 
      chipCount: req.session.chips
    });

    newUser.save().then(function() {
      res.send({ errors: errors });
    });
  }
  else {
    res.send({ errors: errors });
  }
  
});

router.get('/check-username', function(req, res, next) {
  var errors = [];

  if(req.query.value.length < 3) {
    errors.push({
        name: 'username'
      , message: 'A username of at least 3 characters is required'
    });
    res.send({ errors: errors });
    return;
  }

  User.count({username: req.query.value})
  .then(function(userCount) {
    if (userCount > 0) {
      errors.push({
          name: 'username'
        , message: 'That username has been taken'
      });
    }
    res.send({ errors: errors });
  })
  .catch(function(error) {
    console.log("Error:", error);
  });
});

router.get('/check-email', function(req, res, next) {
  var errors = [];

  if(!isEmail(req.query.value)) {
    errors.push({
        name: 'email'
      , message: 'A valid email is required'
    });
    res.send({ errors: errors });
    return;
  }

  User.find({email: req.query.value})
  .then(function(emailCount) {
    if (emailCount > 0) {
      errors.push({
          name: 'email'
        , message: 'That email is in use'
      });
    }
    res.send({ errors: errors });
  })
  .catch(function(error) {
    console.log("Error:", error);
  });
});

router.get('/check-password', function(req, res, next) {
  var errors = [];

  if(req.query.value.length < 3) {
    errors.push({
        name: 'password'
      , message: 'A password of at least 6 characters is required'
    });
  }

  res.send({ errors: errors });
});

function isEmail(email) {
  var regex = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;

  return regex.test(email);
}

module.exports = router;
