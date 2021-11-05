const io = require("./server").io;
const {
  VERIFY_USER,
  USER_CONNECTED,
  COMMUNITY_CHAT,
  USER_DISCONNECTED,
  LOGOUT,
  MESSAGE_RECIEVED,
  MESSAGE_SENT,
  TYPING,
  PRIVATE_MESSAGE,
  NEW_CHAT_USER,
} = require("../client/src/Events");
const { createUser, createThread, createMessage } = require("./Factories");

let connectedUsers = {};

let communityChat = createThread({ isCommunity: true });

module.exports = function (socket) {
  console.log("\x1bc"); //clears console
  console.log("Socket Id: " + socket.id);

  let sendMessageToChatFromUser;

  let sendTypingFromUser;

  socket.on(VERIFY_USER, (name, callback) => {
    if (isUser(connectedUsers, name)) {
      callback({ isUser: true, user: null });
    } else {
      callback({
        isUser: false,
        user: createUser({ name, socketId: socket.id }),
      });
    }
  });

  socket.on(USER_CONNECTED, (user) => {
    user.socketId = socket.id;
    connectedUsers = addUser(connectedUsers, user);
    socket.user = user;

    sendMessageToChatFromUser = sendMessageToChat(user.name);
    sendTypingFromUser = sendTypingToChat(user.name);

    io.emit(USER_CONNECTED, connectedUsers);
    console.log(connectedUsers);
  });

  socket.on("disconnect", () => {
    if ("user" in socket) {
      connectedUsers = removeUser(connectedUsers, socket.user.name);

      io.emit(USER_DISCONNECTED, connectedUsers);
      console.log("Disconnect", connectedUsers);
    }
  });

  socket.on(LOGOUT, () => {
    connectedUsers = removeUser(connectedUsers, socket.user.name);
    io.emit(USER_DISCONNECTED, connectedUsers);
    console.log("Disconnect", connectedUsers);
  });

  socket.on(COMMUNITY_CHAT, (callback) => {
    callback(communityChat);
  });

  socket.on(MESSAGE_SENT, ({ threadId, text }) => {
    sendMessageToChatFromUser(threadId, text);
  });

  socket.on(TYPING, ({ threadId, isTyping }) => {
    sendTypingFromUser(threadId, isTyping);
  });

  socket.on(PRIVATE_MESSAGE, ({ reciever, sender, activeThread }) => {
    if (reciever in connectedUsers) {
      const recieverSocket = connectedUsers[reciever].socketId;
      if (activeThread === null || activeThread.id === communityChat.id) {
        const newThread = createThread({
          title: `${reciever}&${sender}`,
          users: [reciever, sender],
        });
        socket.to(recieverSocket).emit(PRIVATE_MESSAGE, newThread, sender);
        socket.emit(PRIVATE_MESSAGE, newThread, sender);
      }
      //ADD A ANYMOUS IN CHAT
      else {
        if (!(reciever in activeThread.users)) {
          activeThread.users
            .filter((user) => user in connectedUsers)
            .map((user) => connectedUsers[user])
            .map((user) => {
              socket.to(user.socketId).emit(NEW_CHAT_USER, {
                threadId: activeThread.id,
                newUser: reciever,
              });
            });
          socket.emit(NEW_CHAT_USER, {
            threadId: activeThread.id,
            newUser: reciever,
          });
        }
        socket.to(recieverSocket).emit(PRIVATE_MESSAGE, activeThread);
      }
    }
  });
};

const sendTypingToChat = (user) => {
  return (threadId, isTyping) => {
    io.emit(`${TYPING}-${threadId}`, { user, isTyping });
  };
};

const sendMessageToChat = (sender) => {
  return (threadId, text) => {
    io.emit(`${MESSAGE_RECIEVED}-${threadId}`, createMessage({ text, sender }));
  };
};

const addUser = (userListObject, user) => {
  let newListObject = Object.assign({}, userListObject);
  newListObject[user.name] = user;
  return newListObject;
};

const removeUser = (userListObject, username) => {
  let newListObject = Object.assign({}, userListObject);
  delete newListObject[username];
  return newListObject;
};

const isUser = (userListObject, username) => {
  return username in userListObject;
};
