var Chat = require('./models/chat.js');
var moment = require('moment');

module.exports = function(io) {
  io.on('connection', function(socket) {
    if(socket.request.session.loggedIn) {
      var userID = socket.request.session.passport.user;
      var newUser = onlineUsers.add(userID, socket.id);

      if(newUser) {
        socket.broadcast.emit('user connect', userID);
      }

      socket.emit('online list', onlineUsers.getUserIDs());
      socket.join(userID);

      socket.on('disconnect', function(){
        var userID = socket.request.session.passport.user;

        if(onlineUsers.removeSocket(userID, socket.id)) {
          onlineUsers.removeUserTimeout(userID, socket);
        }
      });

      socket.on('send message', function(friendID, msg) {
        var fromID = socket.request.session.passport.user;

        var chat = new Chat({ 
            from: fromID
          , to: friendID
          , message: msg
        });

        chat.save()
        .then(function(savedMsg) {
          var time = moment(savedMsg._id.getTimestamp()).format('ddd DD MMM HH:mm');
          socket.broadcast.to(friendID).emit('receive message', fromID, msg, time);
        });
      });

      socket.on('open chat', function(friendID) {
        var userID = socket.request.session.passport.user;
        onlineUsers.addOpenChats(userID, friendID);
        socket.broadcast.to(userID).emit('open chat', friendID);
      });

      socket.on('close chat', function(friendID) {
        var userID = socket.request.session.passport.user;
        onlineUsers.removeOpenChats(userID, friendID);
        socket.broadcast.to(userID).emit('close chat', friendID);
      });

      socket.on('toggle chat', function(friendID, isMax) {
        var userID = socket.request.session.passport.user;
        var state = isMax? 'max' : 'min';
        if(friendID == 'chat list') {
          onlineUsers.toggleChatState(userID, state);
        }
        else {
          onlineUsers.toggleOpenChats(userID, friendID, state);
        }
      });
    }
  });

  require('./io/poker')(io);
};
