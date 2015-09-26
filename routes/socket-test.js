var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('socket-test');
});

module.exports = router;
