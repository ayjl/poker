var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');


router.get('/', function(req, res) {
  res.render('account', {chips: req.session.user.chips, chipTracker: req.session.user.chipTracker});
});

router.post('/topup-chips', function(req, res, next) {
  
  if (req.session.user.chips < 2000) {
    req.session.user.chips = 2000;
  }
  res.json({chips: req.session.user.chips});
});

module.exports = router;