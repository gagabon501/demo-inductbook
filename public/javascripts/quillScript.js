const quill = new Quill("#editor", {});
const msgBoard = document.getElementById("board_msg").value;
quill.setContents(JSON.parse(msgBoard));
quill.enable(false);
