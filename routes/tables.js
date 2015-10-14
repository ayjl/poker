var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('tables', {tables: tables.all()});
});

router.post('/', function(req, res, next) {
  var errors = [];
  var data = JSON.parse(req.body.data);

  if(data.blinds >= 50 && data.blinds <= 1000 && data.blinds % 50 == 0) {
    var table = tables.create(data.blinds);
    res.send({ tableID: table.id, errors: errors });
  }
  else{
    errors.push({
        name: 'blinds'
      , message: 'Blinds must be between 50 and 1000 and a multiple of 50'
    });
    res.send({ tableID: null, errors: errors });
  }

});

module.exports = router;