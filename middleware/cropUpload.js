const util = require("util");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const db = require("../config/db");

const { GridFsStorage } = require("multer-gridfs-storage");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const app = express();
const storage = new GridFsStorage({ url: "mongodb://yourhost:27017/database" });

app.post("/profile", upload.single("avatar"), function (req, res, next) {
  const { file } = req;
  const stream = fs.createReadStream(file.path);
  storage
    .fromStream(stream, req, file)
    .then(() => res.send("File uploaded"))
    .catch(() => res.status(500).send("error"));
});
