var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');
var validator = require('validator');


router.get('/', function(req, res) {
  res.render('signup');
});

router.post('/', function(req, res, next) {
  var handle = req.body.data;
  var errors = [];
  if(validator.isNull(handle.username)) {
    errors.push('Username required');
  }
  if(!validator.isAlphanumeric(handle.username)) {
    errors.push('Username must be Alphanumeric');
  }
  if(validator.isNull(handle.email)) {
    errors.push('Email required');
  }
  if(validator.isEmail(handle.email)) {
    errors.push('Invalid email');
  }
  if(validator.isNull(handle.password)) {
    errors.push('Password required');
  }
  if(!validator.isLength(handle.password, 6)) {
    errors.push('Password required');
  }
  if (errors.length == 0) {
    var newUser = new User({ 
      username: handle.username, 
      email: handle.email, 
      password: handle.password, 
      chipCount: 2000
    });
    newUser.save().then(function() {
      res.sendStatus(200);
      res.redirect('/account');
    });
  } else {
    res.send(error);
  }
  
});

router.get('/userchecker', function(req, res, next) {
  
  // open database and check if username already exists
  // Returns boolean if found or not
  console.log(req.query.username);
  User.count({username: req.query.username})
  .then(function(userCount) {
    console.log(userCount);
    if (userCount > 0) {
      res.send(false);
    } else {
      res.send(true);
    }
  })
  .catch(function(error) {
    console.log("Failed!", error);
  });
  
  
});

router.get('/emailchecker', function(req, res, next) {
  
  // open database and check if email is already in use
  // Returns boolean if found or not
  console.log(req.query.email);
  User.find({email: req.query.email})
  .then(function(emailCount) {
    console.log(emailCount);
    if (emailCount > 0) {
      res.send(false);
    } else {
      res.send(true);
    }
  })
  .catch(function(error) {
    console.log("Failed!", error);
  });
});

module.exports = router;