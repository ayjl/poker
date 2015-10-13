var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');


router.get('/', function(req, res) {
  res.render('signup');
});

router.post('/submission', function(req, res, next) {
  
  var newUser = new User({ username: req.body.username, email: req.body.email, password: req.body.password, chipCount: 2000});
  newUser.save().then(function() {
    res.sendStatus(200);
  });
  
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