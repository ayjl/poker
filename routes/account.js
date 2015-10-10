var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');


router.get('/', function(req, res) {
  // Using callbacks example
  // var curr = Session.find(function(err, users){
  res.render('account');
  // });
});

router.post('/account', function(req, res, next) {
  var updatedChips = 10000;
  var session = req.body.element;
  // Session
  // .then(function(ses) {
  //   var sessionData = JSON.parse(ses.session);
  //   sessionData.chips = updatedChips;
  //   ses.session = JSON.stringify(sessionData);
  //   ses.save();
  // })
  session.chips = updatedChips;
  // .catch(function(err) {
  //   console.log('error:', err);
  // });
});

module.exports = router;
