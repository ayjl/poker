var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');


router.get('/', function(req, res) {
  res.render('account', {chips: req.session.chips});
});

router.post('/topup-chips', function(req, res, next) {
  
  if (req.session.chips < 500) {
    req.session.chips = 2000;
  }
  res.json({chips: req.session.chips});
});

module.exports = router;