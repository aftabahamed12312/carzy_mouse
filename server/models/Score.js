import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 20 },
    score: { type: Number, required: true, min: 0, max: 1000000 },
    level: { type: Number, required: true, min: 1, max: 100 },
  },
  { timestamps: true }
);
scoreSchema.index({ score: -1 });

export default mongoose.models.Score || mongoose.model("Score", scoreSchema);
