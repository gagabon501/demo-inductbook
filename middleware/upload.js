const util = require("util");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const db = require("../config/db");

const storage = new GridFsStorage({
  url: db.url,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    const match = ["image/png", "image/jpeg", "image/bmp"];

    console.log("req.files: ", req.files);

    const newFname = file.originalname.toLowerCase().replace(/\s+/g, "");

    if (match.indexOf(file.mimetype) === -1) {
      // const filename = `${Date.now()}-${file.originalname.toLowerCase()}`;
      const filename = `${Date.now()}-${newFname}`;
      return filename;
    }

    return {
      bucketName: "docs",
      // filename: `${Date.now()}-${file.originalname.toLowerCase()}`,
      filename: `${Date.now()}-${newFname}`,
    };
  },
});

const uploadFiles = multer({ storage: storage });

// console.log("storage: ", storage);
// console.log("uploadFiles: ", uploadFiles);

module.exports = uploadFiles;
