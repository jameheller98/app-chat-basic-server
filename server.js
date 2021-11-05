const express = require("express");
const app = express();
var server = require("http").Server(app);
var io = (module.exports.io = require("socket.io")(server, {
  cors: {
    origin: ["http://192.168.1.4:3000", "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
}));

const PORT = process.env.PORT || 8080;

const SocketManager = require("./SocketManager");

app.use(express.static(__dirname + "/../../build"));
io.on("connection", SocketManager);

server.listen(PORT, () => {
  console.log("Connected to port: " + PORT);
});
