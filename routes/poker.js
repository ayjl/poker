var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  if(!req.session.user) {
    var num = Math.floor((Math.random() * 100000) + 1).toString();
    var pad = '000000';
    var padded = pad.substring(0, pad.length - num.length) + num;
    req.session.user = 'Guest' + padded;
    req.session.chips = 100000;
  }
  
  res.render('poker');
});

module.exports = router;
