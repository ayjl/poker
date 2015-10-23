var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');

router.get('/', function(req, res) {
  res.render('users');
});

router.get('/rows', function(req, res, next) {
  var rows = [];
  var t = tables.all();
  var userID = '';
  
  if(req.isAuthenticated()) {
    userID = req.user.id;
  }

  User.find(
      { _id: { $ne: userID } }
    , { username: 1, chips: 1 }
  )
  .then(function(users) {
    for(var i=0; i<users.length; i++) {
      rows.push({
          username: users[i].username + '|' + users[i]._id
        , chips: users[i].chips
        , joined: Date.parse(users[i]._id.getTimestamp())
      });
    }

    res.json(rows);
  });
});

module.exports = router;
