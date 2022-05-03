module.exports = {
  url:
    process.env.DEVELOPMENT == "1"
      ? "mongodb://127.0.0.1:27017/"
      : process.env.MONGODB_URI,
  database: process.env.DEVELOPMENT == "1" ? "test" : "gagdb",
};
