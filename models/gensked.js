var mongoose = require("mongoose");

var GenSkedSchema = new mongoose.Schema({
  gensked_title: { type: String, max: 100 },
  gensked_date: { type: Date },
  gensked_session: { type: String },
  gensked_venue: { type: String },
  gensked_pax: { type: Number },
  gensked_tot_booking: { type: Number },
  gensked_avail: { type: Number },
});

module.exports = mongoose.model("GenSked", GenSkedSchema);
