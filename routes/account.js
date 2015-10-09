var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');


// router.get('/', function(req, res, next) {
//   // Using callbacks example
//   var balance = Session.find(function(err, users){
//     res.render('account', { users: users });
//   });
// });

router.post('/', function(req, res, next) {
  var updatedChips = 10000;
  Session
  .then(function(ses) {
    var sessionData = JSON.parse(ses.session);
    sessionData.chips = updatedChips;
    ses.session = JSON.stringify(sessionData);
    ses.save();
  })
  .catch(function(err) {
    console.log('error:', err);
  });
});

module.exports = router;
