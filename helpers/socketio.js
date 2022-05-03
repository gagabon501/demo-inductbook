module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("New user connected");

    socket.on("chat", (data) => {
      socket.broadcast.emit("chat", {
        message: data.message,
        username: data.username,
      });
    });

    //listen on change_username
    socket.on("change_username", (data) => {
      socket.username = data.username;
    });

    //listen on new_message
    socket.on("new_message", (data) => {
      //broadcast the new message
      io.sockets.emit("new_message", {
        message: data.message,
        username: data.username,
      });
    });

    //listen on new_message
    socket.on("login", (data) => {
      //broadcast the new message
      console.log(`User: ${data.email} logged-in`);
      io.sockets.emit("login", {
        email: data.email,
      });
    });

    //listen on new_message
    socket.on("logout", (data) => {
      //broadcast the new message
      console.log(`user ${data.uname} logged out`);
       io.sockets.emit("logout", {
         uname: data.uname,
       });
      //socket.broadcast.emit("logout", { uname: data.uname });
    });

    //listen on typing
    socket.on("typing", (data) => {
      socket.broadcast.emit("typing", { username: data.username });
    });
  });
};
