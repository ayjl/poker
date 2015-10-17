var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');

router.get('/', function(req, res, next) {
  // Using callbacks example
  var users = User.find(function(err, users){
    res.render('db-test', { users: users });
  });
});

router.post('/', function(req, res, next) {
  var newUser = new User({ username: req.body.name });
  // Using promises example
  newUser.save().then(function() {
    res.sendStatus(200);
  });
});

router.delete('/:user_id', function(req, res, next) {
  // Promises seem to be the new way to go
  User.remove({ _id: req.params.user_id }).then(function() {
    res.sendStatus(200);
  });
});

module.exports = router;
