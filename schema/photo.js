"use strict";

const mongoose = require("mongoose");

/**
 * Define the Mongoose Schema for a Comment.
 */
const commentSchema = new mongoose.Schema({
  // The text of the comment.
  comment: String,
  // The date and time when the comment was created.
  date_time: { type: Date, default: Date.now },
  // The ID of the user who created the comment.
  user_id: mongoose.Schema.Types.ObjectId,
  mentions: [mongoose.Schema.Types.ObjectId],
});

/**
 * Define the Mongoose Schema for a Photo.
 */
const photoSchema = new mongoose.Schema({
  // Name of the file containing the photo (in the project6/images directory).
  file_name: String,
  // The date and time when the photo was added to the database.
  date_time: { type: Date, default: Date.now },
  // The ID of the user who created the photo.
  user_id: mongoose.Schema.Types.ObjectId,
  // Array of comment objects representing the comments made on this photo.
  comments: [commentSchema],
  likes: [mongoose.Schema.Types.ObjectId],
});

//1
photoSchema.statics.getUserComments = function (userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return this.aggregate([
        { $unwind: "$comments" },
        { $match: { "comments.user_id": userObjectId } },
        {
            $project: {
                _id: "$comments._id",
                comment: "$comments.comment",
                date_time: "$comments.date_time",
                photo_id: "$_id", 
                photo_file_name: "$file_name", 
                photo_date_time: "$date_time" 
            }
        },
        { $sort: { date_time: -1 } }
    ])
    .exec();
};
//2
photoSchema.statics.getUserCounts = function () {
    return this.aggregate([
        {
            $facet: {
                photoCounts: [
                    { $group: { _id: "$user_id", num_photos: { $sum: 1 } } }
                ],
                commentCounts: [
                    { $unwind: "$comments" },
                    { $group: { _id: "$comments.user_id", num_comments: { $sum: 1 } } }
                ]
            }
        }
    ])
    .exec()
    .then(result => {
        if (result && result.length > 0) {
            return result[0];
        }
        return { photoCounts: [], commentCounts: [] };
    });
};

/**
 * Create a Mongoose Model for a Photo using the photoSchema.
 */
const Photo = mongoose.model("Photo", photoSchema);

/**
 * Make this available to our application.
 */
module.exports = Photo;

