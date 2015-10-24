var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.redirect('/tables');
});

router.get('/:table_id', function(req, res, next) {
  var table = tables.find(req.params.table_id);
  if(table) {
    res.render('poker', { table: table });
  }
  else {
    res.redirect('/tables');
  }
});

router.get('/test/eval', function(req, res, next) {
  var evaluator = require("poker-evaluator");

  var table = {};
  table.pot = 120;
  table.cards = ['Ah', 'Kc', 'Qs', 'Jc', '8c'];
  table.handPlayers = [];
  table.winners = [];
  table.handPlayers.push({
    id: 1,
    bet: 10,
    cards: ['8s', '6h'],
    chips: 0
  });
  table.handPlayers.push({
    id: 2,
    bet: 10,
    // cards: ['2s', '8h'],
    cards: ['8d', '6d'],
    chips: 0
  });
  table.handPlayers.push({
    id: 3,
    bet: 100,
    // cards: ['2s', '8h'],
    cards: ['7d', '6d'],
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
      player.allCards = hand;
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
          if(player.bet < winner.bet) {
            break;
          }
        }
      }

      table.winners.splice(j, 0, player);

      // if (!table.winner) {
      //   table.winner = player;
      // }
      // else if (player.hand.handType > table.winner.hand.handType ||
      //          (player.hand.handType == table.winner.hand.handType &&
      //           player.hand.handRank > table.winner.hand.handRank)) {
      //   table.winner = player;
      // }
    }
  }

  console.log('===== Table Winners =======');
  console.log(table.winners);
  console.log('===========================');


  var start = 0;
  var end = 0;
  var toUpdate = new Set();
  var largestWin = {};
  for(start=0; start<table.winners.length; start++) {
    var numSharing = 1;
    var winnings = table.winners[start].bet;
    if(winnings == 0) {
      continue;
    }

    if(!largestWin.hasOwnProperty(table.winners[start].id)) {
      largestWin[table.winners[start].id] = 0;
    }

    largestWin[table.winners[start].id] -= winnings;

    for(end=start+1; end<table.winners.length; end++) {
      if(table.winners[start].hand.handType == table.winners[end].hand.handType && table.winners[start].hand.handRank == table.winners[end].hand.handRank) {
        numSharing++;
      }

      var deduct = Math.min(table.winners[start].bet, table.winners[end].bet);
      winnings += deduct;
      table.winners[end].bet -= deduct;

      if(!largestWin.hasOwnProperty(table.winners[end].id)) {
        largestWin[table.winners[end].id] = 0;
      }
      largestWin[table.winners[end].id] -= deduct;
    }

    console.log('start:', start);
    console.log('numSharing ' , numSharing);
    console.log('winnings ' , winnings);

    if(winnings == table.winners[start].bet) {
      table.winners[start].chips += winnings;
      largestWin[table.winners[start].id] += winnings;
      console.log('increasing',winnings,'from id:',table.winners[start].id);
      continue;
    }

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
      var winner = table.winners[start+i];
      toUpdate.add(table.winners[start+i]);

      largestWin[winner.id] += winningsPerPlayer;
      console.log('increasing',winnings,'from id:',winner.id);

      winner.chips += winningsPerPlayer;
      if(i < extra) {
        winner.chips++;
        largestWin[winner.id]++;
      }
    }
  }

  console.log('================LargestWin=================');
  console.log('largestWin ' , largestWin);
  console.log('=================================');
  console.log('===============WINNERS==================');
  console.log('table.winners ' , table.winners);
  console.log('=================================');
  table.winners = Array.from(toUpdate);

  for(var prop in largestWin) {
    if(largestWin.hasOwnProperty(prop)) {
      console.log('-> prop:', prop) // DEBUG
    }
    else {
      console.log('-> 1:', 1) // DEBUG
    }
  }

  table.winners = table.winners.map(function(player) {
    return player.chips;
  });

  res.json(table.winners);
});

module.exports = router;
