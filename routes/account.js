var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');


router.get('/', function(req, res) {
  if (req.isAuthenticated()) {
    res.render('account', {chips: req.user.chips});
  } else {
    res.render('account', {chips: req.session.user.chips});
  }
  
});

router.get('/profitability', function(req, res, next) {
  
  if (req.isAuthenticated()) {
    res.json({chipsArray: req.user.chipTracker.change, datesArray: req.user.chipTracker.date});
  } else {
    res.json({chipsArray: 0, datesArray: 0});
  }
  
});

router.post('/topup-chips', function(req, res, next) {
  
  if (req.isAuthenticated()) {
    // console.log(req.user.chips);
    if (req.user.chips < 2000) {
      req.user.chips = 2000;
      // console.log(req.user.chips);
    }
    res.json({chips: req.user.chips});
  } else {
    if (req.session.user.chips < 2000) {
      req.session.user.chips = 2000;
      // console.log(req.session.user.chips);
    }
    res.json({chips: req.session.user.chips});
  }
  
});

module.exports = router;