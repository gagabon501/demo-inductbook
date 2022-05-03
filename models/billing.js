const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const BillingSchema = new mongoose.Schema({
  inv_date: { type: Date, default: Date.now },
  inv_no: { type: Number },
  inv_period: { type: String },
  inv_run_date: { type: Date, default: Date.now },
});

BillingSchema.plugin(AutoIncrement, { inc_field: "inv_no" });
module.exports = mongoose.model("Billing", BillingSchema);
