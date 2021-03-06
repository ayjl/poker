var User = require('../models/user.js');
var Session = require('../models/session.js');
var config = require('config');

module.exports = function(io) {
  var poker = io.of('/poker');

  poker.use(function(socket, next) {
    var handshakeData = socket.request;
    var tableID = handshakeData._query['table'];

    if(!tables.find(tableID)) {
      next(new Error('Invalid table'));
    }
    else {
      socket.join(tableID);
      socket.tableID = tableID;
      next();
    }
  });

  poker.on('connection', function(socket) {
    var table = tables.find(socket.tableID);

    if(table.playing && table.gameState <= 3) {
      var cards = [];
      switch(table.gameState) {
        case 1:
          cards = table.cards.slice(0, 3);
          break;
        case 2:
          cards = table.cards.slice(0, 4);
          break;
        case 3:
          cards = table.cards;
          break;
      }
      socket.emit('players', {
          players: table.players
        , playing: table.playing
        , pot: table.pot
        , cards: cards
        , dealerSeat: table.dealerSeat
        , smallBlindSeat: table.smallBlindSeat
        , bigBlindSeat: table.bigBlindSeat
      });
    }
    else {
      socket.emit('players', {
          players: table.players
        , playing: table.playing
      });
    }
    
    var playerID;
    if(socket.request.session.passport) {
      playerID = socket.request.session.passport.user;
    }
    else{
      playerID = socket.request.sessionID;
    }

    getPlayerName(playerID, socket.request.session.passport)
    .then(function(name) {
      var player = {
          id: playerID
        , name: name
        , guest: true
        , cards: []
        , hand: null
        , socketID: socket.id
        , seat: -1
        , inHand: false
        , bet: 0
        , chips: 0
        , allIn: false
      };
      table.spectators.push(player);

      socket.emit('player id', player);
    });

    socket.on('sit', function(seat) {
      var playerID;
      if(socket.request.session.passport) {
        playerID = socket.request.session.passport.user;
      }
      else{
        playerID = socket.request.sessionID;
      }

      var specIdx = findBySocketID(socket.id, table.spectators);

      getPlayerChips(playerID, socket.request.session.passport)
      .then(function(chips) {
        if(chips < table.blind * config.get('buyInMult')) {
          socket.emit('customError', {
            message: 'You don\'t have enough chips to buy-in for $' + table.blind*config.get('buyInMult') + '.'
          });
          return;
        }

        // If player is not in the spectator list
        if(specIdx == -1) {
          socket.emit('customError', {
            message: 'Something\'s gone wrong, try refreshing the page.'
          });
          return;
        }

        var player = table.spectators[specIdx];

        // If player is already playing
        var playerIdx = findByPlayerID(playerID, table.players);
        if(playerIdx != -1) {
          socket.emit('customError', {
            message: 'You\'re already playing on this table in another tab.'
          });
          return;
        }

        // If seat is occupied
        if(table.players[seat] != null) {
          socket.emit('customError', {
            message: 'The seat you selected is already occupied.'
          });
          return;
        }

        player.chips = table.blind * config.get('buyInMult');
        storePlayerChips(player.id, -player.chips, socket.request.session.passport);
        socket.emit('chips', chips - player.chips);

        table.spectators.splice(specIdx, 1);
        table.players.splice(seat, 1, player);
        player.seat = seat;
        table.numPlayers++;

        socket.broadcast.to(table.id).emit('player join', player, false);
        socket.emit('player join', player, true);

        if (table.numPlayers > 1 && !table.playing) {
          table.playing = true;
          table.gameTimer = setTimeout(function() {
            startGame(table, poker, socket);
          }, 3000);
        }
      });
    });

    // This is inside the poker namespace, so emitting 'action' from the client outside
    // the poker namespace will not trigger this
    socket.on('action', function(action) {
      var table = tables.find(socket.tableID);
      var idx = findBySocketID(socket.id, table.handPlayers);
      var player = table.handPlayers[idx];

      if (idx != -1 && table.turn == idx) {

        if (action.action == 'fold') {
          poker.to(table.id).emit('fold', table.handPlayers[table.turn]);
          
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
            progressGameState(table, poker, socket);
          }
        }
        else{
          if (action.action == 'raise') {
            if(!action.amount) {  // In case action.amount is null
              action.amount = 0;
            }

            var extraRaise = action.amount - table.roundBet;
            if(extraRaise < table.minRaise) {
              extraRaise = table.minRaise;
              action.amount = extraRaise + table.roundBet;
            }
            
            var extraPot = (action.amount - table.roundBet) + (table.bet - player.bet);
            if(extraPot > player.chips) {
              var deduct = extraPot - player.chips;
              extraPot -= deduct;
              extraRaise -= deduct;
              action.amount -= deduct;
            }

            // extra raise may be less if the player is going all in
            if(extraRaise > table.minRaise) {
              table.minRaise = extraRaise;
            }

            table.bet += action.amount - table.roundBet;
            table.roundBet = action.amount;
            player.bet = table.bet;
            table.pot += extraPot;
            player.chips -= extraPot;
            // storePlayerChips(player);

            if(player.chips == 0) {
              player.allIn = true;
            }

            poker.to(table.id).emit('pot', table.pot, table.bet, table.roundBet, table.minRaise, player);
            socket.emit('confirm bet', table.bet, table.roundBet, player);

            var moveToEnd = table.handPlayers.splice(0, idx);
            table.handPlayers = table.handPlayers.concat(moveToEnd);

            table.turn = 0;  // Will be incremented to 1 at the end of the function
          }
          // Call
          else if (action.action == 'check' && player.bet < table.bet) {
            var extraPot = table.bet - player.bet;
            if(extraPot >= player.chips) {
              extraPot = player.chips;
              player.allIn = true;
            }
            
            player.bet += extraPot;
            table.pot += extraPot;
            player.chips -= extraPot;
            // storePlayerChips(player);

            poker.to(table.id).emit('pot', table.pot, table.bet, table.roundBet, table.minRaise, player);
            socket.emit('confirm bet', table.bet, table.roundBet, player);
          }

          table.turn++;

          while(table.handPlayers[table.turn] && table.handPlayers[table.turn].allIn) {
            table.turn++;
            if(table.turn == table.handPlayers.length) {
              progressGameState(table, poker, socket);
              return;
            }
          }
        }

        // Check if all players have had a turn
        if (table.turn == table.handPlayers.length) {
          progressGameState(table, poker, socket);
        }
        else {
          poker.to(table.id).emit('turn', table.handPlayers[table.turn]);
        }
      }
    });

    socket.on('spectate', function() {
      var table = tables.find(socket.tableID);
      playerLeave(table, poker, socket, 'spectate');
    });

    socket.on('disconnect', function() {
      var table = tables.find(socket.tableID);
      playerLeave(table, poker, socket, 'disconnect');
    });
  });

  return io;
};

function startGame(table, poker, socket) {
  if(table.gameTimer && !table.gameTimer._called) {
    return;
  }
  
  resetGame(table, poker);

  if(table.numPlayers < 2) {
    table.playing = false;
    return;
  }

  if(!table.playing) {
    return;
  }

  var deck = require('../helpers/deck')();
  var seat = 0;
  table.handPlayers = table.players.filter(function(item) {
    return item;
  });

  for (var i = 0; i < table.handPlayers.length; i++) {
    var player = table.handPlayers[i];
    player.inHand = true;
    if(player.chips <= table.blind) {
      player.chips = 1000;
      // storePlayerChips(player);
    }
  }

  // Assign dealer
  table.dealerSeat++;
  if(table.dealerSeat >= table.players.length) {
    table.dealerSeat -= table.players.length;
  }
  while (!table.players[table.dealerSeat] || !table.players[table.dealerSeat].inHand) {
    table.dealerSeat++;
    if(table.dealerSeat >= table.players.length) {
      table.dealerSeat -= table.players.length;
    }
  }

  var dealerPlayer = table.players[table.dealerSeat];
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
  table.smallBlindSeat = smallBlindPlayer.seat;

  var bigBlind = smallBlind + 1;
  if(bigBlind >= table.handPlayers.length) {
    bigBlind -= table.handPlayers.length;
  }
  var bigBlindPlayer = table.handPlayers[bigBlind];
  table.bigBlindSeat = bigBlindPlayer.seat;

  // Store the first hand player (the person going to be starting betting each round)
  if(table.handPlayers.length > 2) {
    table.handFirstPlayer = smallBlindPlayer;
  }
  else {
    table.handFirstPlayer = bigBlindPlayer;
  }

  smallBlindPlayer.bet = table.blind/2;
  smallBlindPlayer.chips -= table.blind/2;
  // storePlayerChips(smallBlindPlayer);

  bigBlindPlayer.bet = table.blind;
  bigBlindPlayer.chips -= table.blind;
  // storePlayerChips(bigBlindPlayer);

  // Move the blinds players to the end
  var idx = findBySocketID(table.handFirstPlayer.socketID, table.handPlayers);
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

  poker.to(table.id).emit('players in hand', {
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
  poker.to(table.id).emit('turn', table.handPlayers[table.turn]);
}

function progressGameState(table, poker, socket) {
  table.turn = 0;
  table.roundBet = 0;
  table.minRaise = table.blind;

  if (table.handPlayers.length <= 1) {
    if(table.handPlayers[0] && table.gameState <= 3) {
      table.winners = [table.handPlayers[0].id];
      table.handPlayers[0].chips += table.pot;
      poker.to(table.id).emit('winner', table.handPlayers, table.winners);
      // storePlayerChips(table.handPlayers[0]);
    }

    if (table.numPlayers <= 1) {
      table.playing = false;
    }

    table.gameTimer = setTimeout(function() {
      startGame(table, poker, socket);
    }, 3000);

    return;
  }

  // Check if there is more than one player that is not all in
  var notAllInPlayers = table.handPlayers.filter(function(player) {
    return !player.allIn;
  });

  if(notAllInPlayers.length <= 1) {
    if(table.gameState < 2) {
      poker.to(table.id).emit('community cards', table.cards);
    }
    table.gameState = 3;
  }

  // Reorder players
  var idx = findBySocketID(table.handFirstPlayer.socketID, table.handPlayers);
  var moveToEnd = table.handPlayers.splice(0, idx);
  table.handPlayers = table.handPlayers.concat(moveToEnd);
  
  switch (table.gameState) {
    case 0:
      poker.to(table.id).emit('community cards', table.cards.slice(0, 3));
      break;
    case 1:
      poker.to(table.id).emit('community cards', table.cards.slice(0, 4));
      break;
    case 2:
      poker.to(table.id).emit('community cards', table.cards);
      break;
    case 3:
      evalWinner(table);
      poker.to(table.id).emit('winner', table.handPlayers, table.winners);

      table.gameTimer = setTimeout(function() {
        startGame(table, poker, socket);
      }, 3000);
      break;
    default:
      console.log("default switch. should not be here. gameState: "+table.gameState);
  }

  if(table.gameState <= 3) {
    table.gameState++;
  }
  if(table.gameState >= 0 && table.gameState <= 3) {
    poker.to(table.id).emit('turn', table.handPlayers[table.turn]);
    poker.to(table.id).emit('pot', table.pot, table.bet, table.roundBet, table.minRaise, null);
  }
}

function resetGame(table, poker) {
  poker.to(table.id).emit('reset');
  table.cards = [];
  table.winners = [];
  table.turn = -1;
  table.handPlayers = [];
  table.gameState = -1;
  table.bet = 0;
  table.minRaise = table.blind;
  table.pot = 0;
  table.handFirstPlayer = null;
  table.smallBlindSeat = -1;
  table.bigBlindSeat = -1;

  for (var i = 0; i < table.players.length; i++) {
    if (table.players[i]) {
      var player = table.players[i];
      player.cards = [];
      player.hand = null
      player.inHand = false;
      player.bet = 0;
      player.allIn = false;
    }
  }
}

function playerLeave(table, poker, socket, type) {
  var seat = findBySocketID(socket.id, table.players);

  // If the player leaving is currently a player
  if(seat != -1) {
    socket.broadcast.to(table.id).emit('player leave', seat, false);
    socket.emit('player leave', seat, true);
    var player = table.players[seat];
    table.numPlayers--;
    if(player.inHand) {
      if(table.handFirstPlayer == player) {
        if(table.turn + 1 == table.handPlayers.length) {
          table.handFirstPlayer = table.handPlayers[0];
        }
        else{
          table.handFirstPlayer = table.handPlayers[table.turn+1];
        }
      }

      player.inHand = false;
      handPlayerIdx = findBySocketID(player.socketID, table.handPlayers);
      table.handPlayers.splice(handPlayerIdx, 1);

      if(table.turn > handPlayerIdx) {
        table.turn--;
      }

      if(table.handPlayers.length <= 1) {
        progressGameState(table, poker, socket);
      }
    }

    if(type == 'spectate') {
      table.spectators.push(player);
      player.seat = -1;
    }

    storePlayerChips(player.id, player.chips, socket.request.session.passport)
    .then(function(chips) {
      socket.emit('chips', chips);
    });

    table.players.splice(seat, 1, null);
  }
  // If the player leaving is a spectator
  else {
    if(type == 'disconnect') {
      var idx = findBySocketID(socket.id, table.spectators);

      if(idx != -1) {
        table.spectators.splice(idx, 1);
      }
    }
  }

  if(type == 'disconnect') {
    if(table.numPlayers + table.spectators.length == 0) {
      var regex = /^default-\d+$/;
      if(!regex.test(table.id)) {
        tables.delete(table.id);
      }
    }
  }
}

function evalWinner(table) {
  var evaluator = require("poker-evaluator");
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
    }
  }

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
      if(table.winners[start].hand.handType == table.winners[end].hand.handType &&
          table.winners[start].hand.handRank == table.winners[end].hand.handRank) {
        numSharing++;
      }

      var deduct = Math.min(table.winners[start].bet, table.winners[end].bet);
      winnings += deduct;
      table.winners[end].bet -= deduct;
    }

    // If the player hasn't actually won any chips, then he is just getting back chips
    // that no one matched
    if(winnings == table.winners[start].bet) {
      table.winners[start].chips = winnings;
      // storePlayerChips(table.winners[start]);
      continue;
    }

    var winningsPerPlayer = winnings / numSharing;
    var extra = winningsPerPlayer % 1;
    winningsPerPlayer -= extra;
    if(extra != 0) {
      extra *= numSharing;
      extra = Math.floor(extra);
    }
    table.winners[start].bet = 0;
    for(var i=0; i<numSharing; i++) {
      toUpdate.add(table.winners[start+i]);
      table.winners[start+i].chips += winningsPerPlayer;
      if(i < extra) {
        table.winners[start+i].chips++;
      }
    }
  }

  table.winners = Array.from(toUpdate);
  for(var i=0; i<table.winners.length; i++) {
    // storePlayerChips(table.winners[i]);
  }

  table.winners = table.winners.map(function(player) {
    return player.id;
  });
}

function findBySocketID(socketID, array) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] && array[i].socketID == socketID) {
      return i;
    }
  }

  return -1;
}

function findByPlayerID(playerID, array) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] && array[i].id == playerID) {
      return i;
    }
  }

  return -1;
}

function storePlayerChips(playerID, diff, passport) {
  if(passport) {
    return User.findByIdAndUpdate(playerID, { $inc: { chips: diff } }, { new: true })
    .then(function(user) {
      return user.chips;
    });
  }
  else {
    return Session.findById(playerID)
    .then(function(ses) {
      var sessionData = JSON.parse(ses.session);
      sessionData.user.chips += diff;
      ses.session = JSON.stringify(sessionData);
      return ses.save();
    })
    .then(function(ses) {
      return JSON.parse(ses.session).user.chips;
    });
  }
}

function getPlayerChips(playerID, passport) {
  if(passport) {
    return User.findById(playerID)
    .then(function(user) {
      return user.chips;
    });
  }
  else {
    return Session.findById(playerID)
    .then(function(ses) {
      var sessionData = JSON.parse(ses.session);
      return sessionData.user.chips;
    });
  }
}

function getPlayerName(playerID, passport) {
  if(passport) {
    return User.findById(playerID)
    .then(function(user) {
      return user.username;
    });
  }
  else {
    return Session.findById(playerID)
    .then(function(ses) {
      var sessionData = JSON.parse(ses.session);
      return sessionData.user.username;
    });
  }
}
