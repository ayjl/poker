var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');

/* GET database test */
router.get('/', function(req, res, next) {
  var users = User.find(function(err, users){
    res.render('db-test', { users: users });
  });
});

router.post('/', function(req, res, next) {
  var newUser = new User({ name: req.body.name });
  newUser.save();
  res.sendStatus(200);
});

router.delete('/:user_id', function(req, res, next) {
  User.remove({ _id: req.params.user_id }, function() {
    res.sendStatus(200);
  });
});

module.exports = router;
