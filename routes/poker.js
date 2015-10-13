var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  if(!req.session.user) {
    var num = Math.floor((Math.random() * 100000) + 1).toString();
    var pad = '000000';
    var padded = pad.substring(0, pad.length - num.length) + num;
    req.session.user = 'Guest' + padded;
    req.session.chips = 1000;
  }
  
  // req.session.chips = 1000;

  res.render('poker');
});

router.get('/test-eval', function(req, res, next) {
  var evaluator = require("poker-evaluator");

  var table = {};
  table.pot = 120;
  table.cards = ['4c', '5c', '6c', '8d', '9d'];
  table.handPlayers = [];
  table.winners = [];
  table.handPlayers.push({
    bet: 100,
    cards: ['As', '4c'],
    chips: 0
  });
  table.handPlayers.push({
    bet: 20,
    cards: ['As', '4c'],
    chips: 0
  });
  // table.handPlayers.push({
  //   bet: 100,
  //   cards: ['Ah', '4d'],
  //   chips: 0
  // });
  // table.handPlayers.push({
  //   bet: 20,
  //   cards: ['Ac', '2d'],
  //   chips: 0
  // });

  for (var i = 0; i < table.handPlayers.length; i++) {
    if (table.handPlayers[i]) {
      var player = table.handPlayers[i];
      var hand = table.cards.concat(player.cards);
      var eval = evaluator.evalHand(hand);
      player.hand =
      {
          handType: eval.handType
        , handRank: eval.handRank
        , handName: eval.handName
        , hand: hand
      }

      var playerHand = player.hand;
      var j;
      for(j=0; j<table.winners.length; j++) {
        var winner = table.winners[j];
        var winnerHand = winner.hand
        if(playerHand.handType > winnerHand.handType) {
          break;
        }
        else if(playerHand.handType == winnerHand.handType) {
          if(playerHand.handRank > winnerHand.handRank) {
            break;
          }
          if(player.bet <= winner.bet) {
            break;
          }
        }
      }

      table.winners.splice(j, 0, player);

      if (!table.winner) {
        table.winner = player;
      }
      else if (player.hand.handType > table.winner.hand.handType ||
               (player.hand.handType == table.winner.hand.handType &&
                player.hand.handRank > table.winner.hand.handRank)) {
        table.winner = player;
      }
    }
  }

  console.log(table.winners);
  console.log('============');


  var start = 0;
  var end = 0;
  var toUpdate = new Set();
  for(start=0; start<table.winners.length; start++) {
    var numSharing = 1;
    var winnings = table.winners[start].bet;
    if(winnings == 0) {
      continue;
    }

    for(end=start+1; end<table.winners.length; end++) {
      if(table.winners[start].hand.handType == table.winners[end].hand.handType && table.winners[start].hand.handRank == table.winners[end].hand.handRank) {
        numSharing++;
      }

      var deduct = Math.min(table.winners[start].bet, table.winners[end].bet);
      winnings += deduct;
      table.winners[end].bet -= deduct;
    }

    console.log('start:', start);
    console.log(numSharing);
    console.log(winnings);

    var winningsPerPlayer = winnings / numSharing;
    var extra = winningsPerPlayer % 1;
    winningsPerPlayer -= extra;
    if(extra != 0) {
      extra *= numSharing;
      extra = Math.floor(extra);
    }
    console.log('extra: ',extra);
    table.winners[start].bet = 0;
    for(var i=0; i<numSharing; i++) {
      table.winners[start+i].chips += winningsPerPlayer;
      toUpdate.add(table.winners[start+i]);
      if(i < extra) {
        table.winners[start+i].chips++;
        console.log('giving extra to', start+i);
      }
    }
  }

  console.log(toUpdate.size);
  table.winners = Array.from(toUpdate);
  console.log(table.winners);

  table.winners = table.winners.map(function(player) {
    return player.chips;
  });
  console.log(table.winners);

  res.send(table.winners);
});

module.exports = router;
