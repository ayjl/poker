var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('tables', {tables: tables.all()});
});

router.post('/', function(req, res, next) {
  var errors = [];
  var data = JSON.parse(req.body.data);
  var allowedBlinds = [
    10, 20, 50, 100, 200, 400, 1000, 2000, 4000, 10000, 20000, 40000, 100000, 200000
  ];

  if(allowedBlinds.indexOf(parseInt(data.blinds)) != -1) {
    var table = tables.create(data.blinds);
    res.send({ tableID: table.id, errors: errors });
  }
  else{
    errors.push({
        name: 'blinds'
      , message: 'Please choose from one of the available blinds'
    });
    res.send({ tableID: null, errors: errors });
  }

});

router.get('/rows', function(req, res, next) {
  var rows = [];
  var t = tables.all();
  for(var i=0; i<t.length; i++) {
    var blindsRank;

    if(t[i].blind <= 100) {
      blindsRank = 'low';
    }
    else if(t[i].blind <= 2000) {
      blindsRank = 'medium';
    }
    else if(t[i].blind <= 40000) {
      blindsRank = 'high';
    }
    else {
      blindsRank = 'pro';
    }

    // 50 character string
    var name = '                                                  ';
    name = (t[i].name + name).substr(0, 50);

    rows.push({
        name: name + '|' + t[i].id
        // id: `<a href="/poker/${t[i].id}">${t[i].name}</a>`
      , players: t[i].numPlayers
      , blinds: {
          options: { filterValue: blindsRank },
          value: t[i].blind
          // value: `${t[i].blind/2} / ${t[i].blind}`
        }
    });
  }

  res.json(rows);
});

module.exports = router;
