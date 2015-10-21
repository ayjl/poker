function OnlineUsers() {
  this.users = [];
}

OnlineUsers.prototype.find = function(userID) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    return this.users[idx];
  }
  else {
    return null;
  }
}

OnlineUsers.prototype.getUserIDs = function(userID) {
  return this.users.map(function(user) {
    return { id: user.id, tables: user.tables };
  });
}

OnlineUsers.prototype.getSocketIDs = function(userID) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    return this.users[idx].socketIDs;
  }
  else {
    return [];
  }
}

OnlineUsers.prototype.getOpenChats = function(userID) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    return { chatState: this.users[idx].chatState, openChats: this.users[idx].openChats };
  }
  else {
    return { chatState: 'max', openChats: [] };
  }
}

OnlineUsers.prototype.addOpenChats = function(userID, friendID) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    var chatIdx = this.users[idx].openChats.findIndex(function(chat) {
      return chat.friendID == friendID;
    });

    if(chatIdx == -1) {
      this.users[idx].openChats.unshift({ friendID: friendID, state: 'max' });
    }
  }
  else {
    return [];
  }
}

OnlineUsers.prototype.removeOpenChats = function(userID, friendID) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    var chatIdx = this.users[idx].openChats.findIndex(function(chat) {
      return chat.friendID == friendID;
    });

    if(chatIdx >= 0) {
      this.users[idx].openChats.splice(chatIdx, 1);
    }
  }
}

OnlineUsers.prototype.toggleOpenChats = function(userID, friendID, state) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    var openChat = this.users[idx].openChats.find(function(chat) {
      return chat.friendID == friendID;
    });

    if(openChat) {
      openChat.state = state;
    }
  }
}

OnlineUsers.prototype.toggleChatState = function(userID, state) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    this.users[idx].chatState = state;
  }
}

OnlineUsers.prototype.addTable = function(userID, tableID, tableName, tableBlind) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    var tableIdx = this.users[idx].tables.findIndex(function(table) {
      return table.id == tableID;
    });

    if(tableIdx == -1) {
      this.users[idx].tables.push({ id: tableID, name: tableName, blind: tableBlind });
    }
  }
}

OnlineUsers.prototype.removeTable = function(userID, tableID) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    var tableIdx = this.users[idx].tables.findIndex(function(table) {
      return table.id == tableID;
    });

    if(tableIdx >= 0) {
      this.users[idx].tables.splice(tableIdx, 1);
    }
  }
}

OnlineUsers.prototype.add = function(userID, socketID) {
  var idx = this.binarySearch(userID);
  if(idx < 0) {
    var user = {
        id: userID
      , socketIDs: [socketID]
      , openChats: []
      , chatState: 'max'
      , dcTimer: null
      , tables: []
    };

    idx = -(idx + 1);
    this.users.splice(idx, 0, user);
    return true;
  }
  else{
    clearTimeout(this.users[idx].dcTimer);
    this.users[idx].socketIDs.push(socketID);
    return false;
  }
}

OnlineUsers.prototype.removeSocket = function(userID, socketID) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    var socketIdx = this.users[idx].socketIDs.indexOf(socketID);
    if(socketIdx >= 0) {
      this.users[idx].socketIDs.splice(socketIdx, 1);
    }

    if(this.users[idx].socketIDs.length == 0) {
      return true;
    }
    else {
      return false;
    }
  }
}

OnlineUsers.prototype.removeUserTimeout = function(userID, socket) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    var user = this.users[idx];
    user.dcTimer = setTimeout(function() {
      if(user.socketIDs.length == 0) {
        onlineUsers.removeUser(user.id);
        socket.broadcast.emit('user disconnect', user.id);
      }
    }, 5000)
  }
}

OnlineUsers.prototype.removeUser = function(userID) {
  var idx = this.binarySearch(userID);
  if(idx >= 0) {
    this.users.splice(idx, 1);
  }
}

OnlineUsers.prototype.binarySearch = function(key) {
  var lo = 0;
  var hi = this.users.length - 1;

  while(lo <= hi) {
    var mid = (lo + hi) >>> 1;
    var midID = this.users[mid].id;

    if(midID < key) {
      lo = mid + 1;
    }
    else if(midID > key) {
      hi = mid - 1;
    }
    else {
      return mid;
    }
  }

  return -(lo + 1);
}

module.exports = OnlineUsers;