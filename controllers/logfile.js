const archiver = require("archiver");
const fs = require("fs");

// const output = file_system.createWriteStream("target.zip");
// const archive = archiver("zip");

// output.on("close", function () {
//   console.log(archive.pointer() + " total bytes");
//   console.log(
//     "archiver has been finalized and the output file descriptor has closed."
//   );
// });

// archive.on("error", function (err) {
//   throw err;
// });

// archive.pipe(output);

// // append files from a sub-directory, putting its contents at the root of archive
// archive.directory(source_dir, false);

// // append files from a sub-directory and naming it `new-subdir` within the archive
// archive.directory("subdir/", "new-subdir");

// archive.finalize();

/**
 * @param {String} sourceDir: /some/folder/to/compress
 * @param {String} outPath: /path/to/created.zip
 * @returns {Promise}
 */
function zipDirectory(sourceDir, outPath) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on("error", (err) => reject(err))
      .pipe(stream);

    stream.on("close", () => resolve());
    archive.finalize();
  });
}

exports.logfile_get = async (req, res) => {
  //validate first if the user did not come to this route directly without authorization - if he/she did, then kick him/her out
  if (!req.session.userId) {
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    //return next(err);
    return res.redirect("/logout");
  }

  if (req.session.level < 5) {
    res.redirect("/home");
  }
  await zipDirectory("server", "./serverlog.zip");
  res.download("serverlog.zip");
};
