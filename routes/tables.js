var express = require('express');
var router = express.Router();
var config = require('config');

router.get('/', function(req, res, next) {
  res.render('tables', {tables: tables.all()});
});

router.post('/', function(req, res, next) {
  var errors = [];
  var data = JSON.parse(req.body.data);
  var allowedBlinds = config.get('allowedBlinds');

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
      , players: t[i].numPlayers
      , blinds: {
          options: { filterValue: blindsRank },
          value: t[i].blind
        }
      , buyIn: t[i].blind * config.get('buyInMult')
    });
  }

  res.json(rows);
});

router.get('/quick', function(req, res, next) {
  // Minimum blind amount
  if(req.session.chips < 10 * config.get('buyInMult')) {
    res.redirect('/account');
    return;
  }

  var t = tables.all();
  var best = null;

  for(var i=0; i<t.length; i++) {
    var table = t[i];

    // Check if player can afford buy-in
    if(req.session.chips < table.blind * config.get('buyInMult')) {
      continue;
    }

    // Check if table is full
    if(table.numPlayers == 6) {
      continue;
    }

    // Favour tables with the highest number of players and the highest number of blinds
    if(!best || (table.numPlayers > best.numPlayers ||
                 (table.numPlayers == best.numPlayers && table.blind > best.blind))) {
      best = table;
    }
  }

  // If no tables exist with free slots
  if(best == null) {
    var allowedBlinds = config.get('allowedBlinds');
    var i;
    for(i=0; i<allowedBlinds.length; i++) {
      if(req.session.chips < allowedBlinds[i] * config.get('buyInMult')) {
        break;
      }
    }

    if(i > 0) {
      var table = tables.create(allowedBlinds[i-1]);
      res.redirect('/poker/' + table.id);
    }
    else{
      res.redirect('/account');
    }

    return;
  }

  res.redirect('/poker/' + best.id + '?quick=true');
});

module.exports = router;
