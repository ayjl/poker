var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');


router.get('/', function(req, res) {
  var chips;
  if(req.user) {
    chips = req.user.chips;
  }
  else {
    chips = req.session.user.chips;
  }

  res.render('account', { chips: chips });
});

router.post('/topup-chips', function(req, res, next) {
  if(req.user) {
    if(req.user.chips < 2000) {
      User.findByIdAndUpdate(req.user.id, { $set: { chips: 2000 } }, { new: true })
      .then(function(user) {
        return res.json({chips: user.chips});
      });
    }
  }
  else {
    if (req.session.user.chips < 2000) {
      req.session.user.chips = 2000;
    }
    return res.json({chips: req.session.user.chips});
  }
});

module.exports = router;
