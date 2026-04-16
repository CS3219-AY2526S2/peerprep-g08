const mongoose = require("mongoose");

const questionSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a title for the question"],
      trim: true,
    },

    question: {
      type: String,
      required: [true, "Please provide the question description"],
    },

    answer: {
      type: String,
      required: [true, "Please provide the answer or solution"],
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
      index: true, // for filtering by difficulty
    },

    category: {
      type: String,
      required: [true, "Please specify a topic category"],
      index: true,
    },

    tags: [
      {
        type: String,
      },
    ],

    examples: [
      {
        input: String,
        output: String,
        explanation: String,
      },
    ],
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("Question", questionSchema);