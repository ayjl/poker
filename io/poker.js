module.exports = function(io) {
  var poker = io.of('/poker');

  var table = {
      players: [null, null, null, null, null, null, null, null, null]
    , cards: []
    , numPlayers: 0
    , playing: false
    , turn: -1
    , handPlayers: []
    , handFirstPlayer: null
    , gameState: -1
    , pot: 0
    , bet: 0
    , roundBet: 0
    , blind: 10
    , minRaise: 0  // This gets set to the blind before each round of betting
    , dealer: 0
  };

  poker.on('connection', function(socket) {
    var req = socket.handshake;

    var seat;

    for (seat = 0; seat < table.players.length; seat++) {
      if (!table.players[seat]) {
        break;
      }
    }

    var player = {
        id: req.sessionID
      , name: req.session.user
      , guest: true
      , cards: []
      , hand: null
      , socketID: socket.id
      , seat: seat
      , inHand: false
      , bet: 0
      , chips: req.session.chips
    };

    // Should try to avoid exposing this to all clients
    // and also a player's cards
    table.players.splice(seat, 1, player);
    table.numPlayers++;

    socket.broadcast.emit('player join', player);
    socket.emit('players', table.players);
    socket.emit('player id', player);

    var gameTimer = {};
    if (table.numPlayers > 1 && !table.playing) {
      table.playing = true;
      startGame(table, poker, socket, gameTimer);
    }

    // This is inside the poker namespace, so emitting 'action' from the client outside
    // the poker namespace will not trigger this
    socket.on('action', function(action) {
      var idx = getHandPlayerBySocket(socket.id, table);
      var player = table.handPlayers[idx];

      if (idx != -1 && table.turn == idx) {

        if (action.action == 'fold') {
          poker.emit('fold', table.handPlayers[table.turn]);
          
          if(table.handFirstPlayer == player) {
            if(table.turn + 1 == table.handPlayers.length) {
              table.handFirstPlayer = table.handPlayers[0];
            }
            else{
              table.handFirstPlayer = table.handPlayers[table.turn+1];
            }
          }
          
          table.handPlayers[table.turn].inHand = false;
          table.handPlayers.splice(idx, 1);
          if (table.handPlayers.length <= 1) {
            progressGameState(table, poker, socket, gameTimer);
          }
        }
        else{
          if (action.action == 'raise') {
            if(!action.amount) {  // In case action.amount is null
              action.amount = 0;
            }
            if(action.amount > player.chips + player.bet) {  // if betting more than they have
              action.amount = player.chips + player.bet;
            }
            var extraRaise = action.amount - table.roundBet;
            if (extraRaise < table.minRaise) {
              extraRaise = table.minRaise;
              action.amount = extraRaise + table.roundBet;
            }
            else if(extraRaise > table.minRaise) {
              table.minRaise = extraRaise;
            }
            // var extraPot = action.amount - player.bet;
            var extraPot = (action.amount - table.roundBet) + (table.bet - player.bet);
            table.bet += action.amount - table.roundBet;
            table.roundBet = action.amount;
            player.bet = table.bet;
            table.pot += extraPot;
            player.chips -= extraPot;
            storePlayerChips(player);
            /*table.bet += action.amount;
            var extra = table.bet - player.bet;
            table.pot += extra;
            player.bet = table.bet;
            player.chips -= extra;
            storePlayerChips(player);*/

            poker.emit('pot', table.pot, table.bet, table.roundBet, table.minRaise);
            socket.emit('confirm bet', table.bet, player.chips);
            // socket.broadcast.emit('raise', action.amount);

            var moveToEnd = table.handPlayers.splice(0, idx);
            table.handPlayers = table.handPlayers.concat(moveToEnd);

            table.turn = 0;  // Will be incremented to 1 at the end of the function
          }
          // Call
          else if (action.action == 'check' && player.bet < table.bet) {
            var extraPot = table.bet - player.bet;
            player.bet = table.bet;
            table.pot += extraPot;
            player.chips -= extraPot;
            storePlayerChips(player);

            poker.emit('pot', table.pot, table.bet, table.roundBet, table.minRaise);
            socket.emit('confirm bet', table.bet, player.chips);
          }

          table.turn++;
        }

        // Check if all players have had a turn
        if (table.turn == table.handPlayers.length) {
          progressGameState(table, poker, socket, gameTimer);
        }
        else {
          poker.emit('turn', table.handPlayers[table.turn]);
        }
        
        console.log('thank you');
      } else {
        console.log('not your turn');
      }
    });

    socket.on('disconnect', function() {
      var seat;
      for (seat = 0; seat < table.players.length; seat++) {
        if (table.players[seat] && table.players[seat].id === req.sessionID) {
          break;
        }
      }

      if (seat < table.players.length) {
        socket.broadcast.emit('player leave', seat);
        player = table.players[seat];
        table.numPlayers--;
        if (player.inHand) {
          if(table.handFirstPlayer == player) {
            if(table.turn + 1 == table.handPlayers.length) {
              table.handFirstPlayer = table.handPlayers[0];
            }
            else{
              table.handFirstPlayer = table.handPlayers[table.turn+1];
            }
          }

          player.inHand = false;
          handPlayerIdx = getHandPlayerBySocket(player.socketID, table);
          table.handPlayers.splice(handPlayerIdx, 1);

          if (table.turn > handPlayerIdx) {
            table.turn--;
          }

          if (table.handPlayers.length <= 1) {
            progressGameState(table, poker, socket, gameTimer);
          }
        }
        table.players.splice(seat, 1, null);
      }
    });
  });

  return io;
};

function startGame(table, poker, socket, gameTimer) {
  resetGame(table, poker);
  var deck = require('../helpers/deck')();
  var seat = 0;
  table.handPlayers = table.players.filter(function(item) {
    return item;
  });

  for (var i = 0; i < table.handPlayers.length; i++) {
    var player = table.handPlayers[i];
    player.inHand = true;
  }

  // Assign dealer
  table.dealer++;
  if(table.dealer >= table.players.length) {
    table.dealer -= table.players.length;
  }
  while (!table.players[table.dealer] || !table.players[table.dealer].inHand) {
    table.dealer++;
    if(table.dealer >= table.players.length) {
      table.dealer -= table.players.length;
    }
  }

  var dealerPlayer = table.players[table.dealer];
  var dealerInHand = table.handPlayers.indexOf(dealerPlayer);

  // Assign blinds
  table.pot += table.blind + table.blind/2;

  var smallBlind = dealerInHand;
  if(table.handPlayers.length > 2) {
    smallBlind++;
    if(smallBlind >= table.handPlayers.length) {
      smallBlind -= table.handPlayers.length;
    }
  }
  var smallBlindPlayer = table.handPlayers[smallBlind];

  var bigBlind = smallBlind + 1;
  if(bigBlind >= table.handPlayers.length) {
    bigBlind -= table.handPlayers.length;
  }
  var bigBlindPlayer = table.handPlayers[bigBlind];

  // Store the first hand player (the person going to be starting betting each round)
  if(table.handPlayers.length > 2) {
    table.handFirstPlayer = smallBlindPlayer;
  }
  else {
    table.handFirstPlayer = bigBlindPlayer;
  }

  smallBlindPlayer.bet = table.blind/2;
  smallBlindPlayer.chips -= table.blind/2;
  storePlayerChips(smallBlindPlayer);

  bigBlindPlayer.bet = table.blind;
  bigBlindPlayer.chips -= table.blind;
  storePlayerChips(bigBlindPlayer);

  // Move the blinds players to the end
  var idx = getHandPlayerBySocket(table.handFirstPlayer.socketID, table);
  if(table.handPlayers.length > 2) {
    idx += 2;
  }
  else {
    idx += 1;
  }
  if(idx >= table.handPlayers.length) {
    idx -= table.handPlayers.length
  }
  var moveToEnd = table.handPlayers.splice(0, idx);
  table.handPlayers = table.handPlayers.concat(moveToEnd);

  poker.emit('players in hand', {
      players: table.handPlayers
    , dealerID: dealerPlayer.id
    , smallBlindID: smallBlindPlayer.id
    , bigBlindID: bigBlindPlayer.id
    , pot: table.pot
    , blind: table.blind
  });

  table.bet = table.blind;
  table.roundBet = table.blind;
  table.minRaise = table.blind;

  socket.emit(smallBlindPlayer.socketID).emit('confirm chips', smallBlindPlayer.chips);
  socket.emit(bigBlindPlayer.socketID).emit('confirm chips', bigBlindPlayer.chips);

  // Deal player cards
  var player;
  for (var i = 0; i < table.handPlayers.length; i++) {
    var player = table.handPlayers[i];
    player.cards.push(deck.shift());
  }
  for (var i = 0; i < table.handPlayers.length; i++) {
    var player = table.handPlayers[i];
    player.cards.push(deck.shift());
    if (socket.id == player.socketID) {
      socket.emit(player.socketID).emit('player cards', player.cards, player.seat);
    } else {
      socket.broadcast.to(player.socketID).emit('player cards', player.cards, player.seat);
    }
  }

  // Deal community cards
  table.cards.push(deck.shift());
  table.cards.push(deck.shift());
  table.cards.push(deck.shift());
  deck.shift();
  table.cards.push(deck.shift());
  deck.shift();
  table.cards.push(deck.shift());

  table.gameState = 0;
  table.turn = 0;
  poker.emit('turn', table.handPlayers[table.turn]);
}

function progressGameState(table, poker, socket, gameTimer) {
  table.turn = 0;
  table.roundBet = 0;
  table.minRaise = table.blind;

  if (table.handPlayers.length <= 1) {
    table.winner = table.handPlayers[0];
    if(table.winner) {
      poker.emit('winner', table.winner);
      table.winner.chips += table.pot;
      storePlayerChips(table.winner);
      socket.broadcast.to(table.winner.socketID).emit('confirm chips', table.winner.chips);
    }

    gameTimer['timer'] = setTimeout(function() {
      startGame(table, poker, socket, gameTimer);
    }, 3000);

    if (table.numPlayers <= 1) {
      setTimeout(function() {
        resetGame(table, poker);
      }, 3000);

      table.playing = false;
      clearTimeout(gameTimer.timer);
    }

    return;
  }

  // Reorder players
  var idx = getHandPlayerBySocket(table.handFirstPlayer.socketID, table);
  var moveToEnd = table.handPlayers.splice(0, idx);
  table.handPlayers = table.handPlayers.concat(moveToEnd);
  
  switch (table.gameState) {
    case 0:
      poker.emit('community cards', table.cards.slice(0, 3));
      break;
    case 1:
      poker.emit('community cards', table.cards.slice(0, 4));
      break;
    case 2:
      poker.emit('community cards', table.cards);
      break;
    case 3:
      evalWinner(table);
      poker.emit('winner', table.winner);
      table.winner.chips += table.pot;
      storePlayerChips(table.winner);
      socket.broadcast.to(table.winner.socketID).emit('confirm chips', table.winner.chips);

      gameTimer['timer'] = setTimeout(function() {
        startGame(table, poker, socket, gameTimer);
      }, 3000);
      break;
    default:
      console.log("default switch. should not be here. gameState: "+table.gameState);
  }

  if(table.gameState >= 0 && table.gameState <= 2) {
    poker.emit('turn', table.handPlayers[table.turn]);
    poker.emit('pot', table.pot, table.bet, table.roundBet, table.minRaise);
  }

  table.gameState++;
}

function resetGame(table, poker) {
  poker.emit('reset');
  table.cards = [];
  table.winner = null;
  table.turn = -1;
  table.handPlayers = [];
  table.gameState = -1;
  table.bet = 0;
  table.minRaise = table.blind;
  table.pot = 0;
  table.handFirstPlayer = null;

  for (var i = 0; i < table.players.length; i++) {
    if (table.players[i]) {
      var player = table.players[i];
      player.cards = [];
      player.hand = null
      player.inHand = false;
      player.bet = 0;
    }
  }
}

function evalWinner(table) {
  var evaluator = require("poker-evaluator");

  for (var i = 0; i < table.players.length; i++) {
    if (table.players[i]) {
      var player = table.players[i];
      var hand = table.cards.concat(player.cards);
      var eval = evaluator.evalHand(hand);
      player.hand =
      {
          handType: eval.handType
        , handRank: eval.handRank
        , handName: eval.handName
        , hand: hand
      }

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
}

function getHandPlayerBySocket(socketID, table) {
  for (var i = 0; i < table.handPlayers.length; i++) {
    if (table.handPlayers[i] && table.handPlayers[i].socketID == socketID) {
      return i;
    }
  }

  return -1;
}

function storePlayerChips(player) {
  var Session = require('../models/session.js');
  var id = player.id;

  Session.findById(id)
  .then(function(ses) {
    var sessionData = JSON.parse(ses.session);
    sessionData.chips = player.chips;
    ses.session = JSON.stringify(sessionData);
    ses.save();
  })
  .catch(function(err) {
    console.log('error:', err);
  });
}