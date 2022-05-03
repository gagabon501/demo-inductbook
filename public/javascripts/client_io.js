$(function () {
  //make connection
  //var socket = io.connect("http://localhost:5000");
  var socket = io();

  //buttons and inputs - chats
  var message = $("#input");
  var username = $("#username");
  var send_message = $("#send_message");
  var send_username = $("#send_username");
  var chatroom = $("#chatroom");
  var feedback = $("#feedback");
  var chat = $("#chat");

  //buttons and inputs - logins and logouts
  var email = $("#inputEmail");
  var loginbutton = $("#loginbutton");
  var logout = $("#signout1");
  var logdisplay = $("#logdisplay");
  var uname = $("#uname");

  //default username
  socket.username = uname.val();
  console.log(socket.username);

  //default username
  socket.email = email.val();
  socket.uname = uname.val();
  console.log(socket.email);

  //Joined chat
  chat.click(function () {
    socket.emit("chat", {
      message: "joined",
      username: uname.val(),
    });
  });

  //Emit message
  send_message.click(function () {
    socket.emit("new_message", {
      message: message.val(),
      username: uname.val(),
    });
  });

  socket.on("chat", (data) => {
    console.log(data);
    feedback.html("");
    message.val("");
    chatroom.append(
      "<p class='message'>" + data.username + ": " + data.message + "</p>"
    );
  });

  //Listen on new_message
  socket.on("new_message", (data) => {
    console.log(data);
    feedback.html("");
    message.val("");
    chatroom.append(
      "<p class='message'>" + data.username + ": " + data.message + "</p>"
    );
  });

  //Emit a username
  send_username.click(function () {
    socket.emit("change_username", { username: username.val() });
  });

  //Emit typing
  message.bind("keypress", () => {
    socket.emit("typing", { username: uname.val() });
  });

  //Listen on typing
  socket.on("typing", (data) => {
    feedback.html(
      "<p><i>" + data.username + " is typing a message..." + "</i></p>"
    );
  });

  //Emit message
  loginbutton.click(function () {
    console.log("Logged-in")
    socket.emit("login", {
      email: email.val(),
    });
  });

  logout.click(function () {
    console.log("Logout")
    socket.emit("logout", {
      uname: uname.val(),
    });
  });

  //Listen on new_message
  socket.on("login", (data) => {
    console.log(data);
    const today = new Date();
    logdisplay.append(
      "<p class='message-login'>" +
        data.email +
        " has successfully logged-in " +
        today +
        "</p>"
    );
  });

  //Listen on new_message
  socket.on("logout", (data) => {
    console.log(data);
    const today = new Date();
    logdisplay.append(
      "<p class='message-logout'>" +
        data.uname +
        " has successfully logged-out " +
        today +
        "</p>"
    );
  });
});
