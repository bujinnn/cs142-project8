/**
 * This builds on the webServer of previous projects in that it exports the
 * current directory via webserver listing on a hard code (see portno below)
 * port. It also establishes a connection to the MongoDB named 'cs142project6'.
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch
 * any file accessible to the current user in the current directory or any of
 * its children.
 *
 * This webServer exports the following URLs:
 * /            - Returns a text status message. Good for testing web server
 *                running.
 * /test        - Returns the SchemaInfo object of the database in JSON format.
 *                This is good for testing connectivity with MongoDB.
 * /test/info   - Same as /test.
 * /test/counts - Returns the population counts of the cs142 collections in the
 *                database. Format is a JSON object with properties being the
 *                collection name and the values being the counts.
 *
 * The following URLs need to be changed to fetch there reply values from the
 * database:
 * /user/list         - Returns an array containing all the User objects from
 *                      the database (JSON format).
 * /user/:id          - Returns the User object with the _id of id (JSON
 *                      format).
 * /photosOfUser/:id  - Returns an array with all the photos of the User (id).
 *                      Each photo should have all the Comments on the Photo
 *                      (JSON format).
 */
const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");
const async = require("async");
const express = require("express");
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const multer = require("multer");

// Load the Mongoose schema for User, Photo, and SchemaInfo
const User = require("./schema/user.js");
const Photo = require("./schema/photo.js");
const SchemaInfo = require("./schema/schemaInfo.js");

mongoose.set("strictQuery", false);
mongoose.connect("mongodb://127.0.0.1/cs142project6", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.json());
app.use(express.static(__dirname));
app.use(session({secret: "secretKey", resave: false, saveUninitialized: false}));
app.use(bodyParser.json());

/**
 * Middleware: Login шалгах (Async-гүй хувилбар)
 */
app.use(function(req, res, next) {
  if (
    req.path === "/admin/login" ||
    req.path === "/admin/logout" ||
    req.path === "/user" || 
    req.path.startsWith("/test") ||
    req.path === "/"
  ) {
    return next();
  }
  if (!req.session.user_id) { 
    return res.status(401).send("Unauthorized");
  }
  return next();
});

/**
 * Helper: Хэрэглэгчийн сүүлийн үйлдлийг тодорхойлох 
 */
function getLastActivity(userId) {
    let activity = { type: "registered as a user", date_time: null };
    return Photo.findOne({ user_id: userId }).sort({ date_time: -1 }).exec()
        .then(function(lastPhoto) {
            if (lastPhoto) {
                activity = { type: "posted a photo", date_time: lastPhoto.date_time, file_name: lastPhoto.file_name };
            }
            return Photo.find({ "comments.user_id": userId }).exec();
        })
        .then(function(allPhotos) {
            let lastComment = null;
            allPhotos.forEach(p => {
                p.comments.forEach(c => {
                    if (c.user_id.toString() === userId.toString()) {
                        if (!lastComment || c.date_time > lastComment.date_time) {
                            lastComment = { date_time: c.date_time, type: "added a comment", file_name: p.file_name };
                        }
                    }
                });
            });
            if (lastComment && (!activity.date_time || lastComment.date_time > activity.date_time)) {
                return lastComment;
            }
            return activity;
        });
}

/**
 * Use express to handle argument passing in the URL. This .get will cause
 * express to accept URLs with /test/<something> and return the something in
 * request.params.p1.
 * 
 * If implement the get as follows:
 * /test        - Returns the SchemaInfo object of the database in JSON format.
 *                This is good for testing connectivity with MongoDB.
 * /test/info   - Same as /test.
 * /test/counts - Returns an object with the counts of the different collections
 *                in JSON format.
 */
app.get("/test/:p1", function (request, response) {
  // Express parses the ":p1" from the URL and returns it in the request.params
  // objects.
  console.log("/test called with param1 = ", request.params.p1);

  const param = request.params.p1 || "info";

  if (param === "info") {
    // Fetch the SchemaInfo. There should only one of them. The query of {} will
    // match it.
    SchemaInfo.find({}, function (err, info) {
      if (err) {
        // Query returned an error. We pass it back to the browser with an
        // Internal Service Error (500) error code.
        console.error("Error in /user/info:", err);
        response.status(500).send(JSON.stringify(err));
        return;
      }
      if (info.length === 0) {
        // Query didn't return an error but didn't find the SchemaInfo object -
        // This is also an internal error return.
        response.status(500).send("Missing SchemaInfo");
        return;
      }

      // We got the object - return it in JSON format.
      console.log("SchemaInfo", info[0]);
      response.end(JSON.stringify(info[0]));
    });
  } else if (param === "counts") {
    // In order to return the counts of all the collections we need to do an
    // async call to each collections. That is tricky to do so we use the async
    // package do the work. We put the collections into array and use async.each
    // to do each .count() query.
    const collections = [
      { name: "user", collection: User },
      { name: "photo", collection: Photo },
      { name: "schemaInfo", collection: SchemaInfo },
    ];
    async.each(
      collections,
      function (col, done_callback) {
        col.collection.countDocuments({}, function (err, count) {
          col.count = count;
          done_callback(err);
        });
      },
      function (err) {
        if (err) {
          response.status(500).send(JSON.stringify(err));
        } else {
          const obj = {};
          for (let i = 0; i < collections.length; i++) {
            obj[collections[i].name] = collections[i].count;
          }
          response.end(JSON.stringify(obj));
        }
      }
    );
  } else {
    // If we know understand the parameter we return a (Bad Parameter) (400)
    // status.
    response.status(400).send("Bad param " + param);
  }
});

app.get("/", function (request, response) {
  response.send("Simple web server of files from " + __dirname);
});

/**
 * URL /admin/login 
 */
app.post("/admin/login", function (request, response) {
    const { login_name, password } = request.body;
    User.findOne({ login_name: login_name }).exec()
        .then(function(user) {
            if (!user || user.password !== password) {
                return response.status(400).send("Invalid credentials");
            }
            request.session.user_id = user._id;
            request.session.login_name = user.login_name;
            return response.status(200).send({ _id: user._id, first_name: user.first_name, login_name: user.login_name });
        })
        .catch(function(err) { response.status(500).send(err); });
});

app.post("/admin/logout", function (req, res) {
  if (!req.session.user_id) return res.status(400).send("Not logged in");
  req.session.destroy();
  return res.sendStatus(200);
});

/**
 * URL /user/list 
 */
app.get("/user/list", function (req, res) {
    User.find({}).select("_id first_name last_name").lean().exec()
        .then(function(users) {
            const promises = users.map(user => {
                return getLastActivity(user._id).then(act => {
                    user.last_activity = act;
                    return user;
                });
            });
            return Promise.all(promises);
        })
        .then(function(result) { res.status(200).send(result); })
        .catch(function(err) { res.status(500).send(err); });
});

/**
 * URL /user/:id 
 */
app.get("/user/:id", function (req, res) {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send("Invalid ID");

    return User.findById(userId).select("_id first_name last_name location description occupation").lean().exec()
        .then(function(user) {
            if (!user) return res.status(400).send("Олдсонгүй");
            const p1 = Photo.countDocuments({ user_id: userId });
            const p2 = Photo.find({}); 
            const p3 = Photo.findOne({ user_id: userId }).sort({ date_time: -1 }).lean().exec();
            const p4 = Photo.find({ user_id: userId }).lean().exec();

            return Promise.all([p1, p2, p3, p4, getLastActivity(userId)]).then(vals => {
                const [numPhotos, allPhotos, recentPhoto, userPhotos, lastActivity] = vals;
                let totalC = 0;
                allPhotos.forEach(p => { 
                    if (p.comments) p.comments.forEach(c => { if (c.user_id && c.user_id.toString() === userId) totalC++;  }); 
                });
                let mostCommented = null;
                let maxComments = -1;
                userPhotos.forEach(photo => {
                    const count = photo.comments ? photo.comments.length : 0;
                    if (count > maxComments) {
                        maxComments = count;
                        mostCommented = photo;
                    }
                });
                return res.status(200).send({
                    ...user,
                    num_photos: numPhotos,
                    num_comments: totalC,
                    recent_photo: recentPhoto, 
                    most_commented_photo: mostCommented, 
                    last_activity: lastActivity
                });
            });
        })
        .catch(err => res.status(500).send(err));
});

/**
 * URL /photosOfUser/:id 
 */
app.get("/photosOfUser/:id", function (req, res) {
    const userId = req.params.id;
    Photo.find({ user_id: userId }).lean().exec()
        .then(function(photos) {
            const photoPromises = photos.map(photo => {
                const commentPromises = (photo.comments || []).map(c => {
                    return User.findById(c.user_id).select("_id first_name last_name").lean().exec()
                        .then(user => {
                            c.user = user;
                            return c;
                        });
                });
                return Promise.all(commentPromises).then(comments => {
                    photo.comments = comments;
                    return photo;
                });
            });
            return Promise.all(photoPromises);
        })
        .then(function(processed) {
            processed.sort((a, b) => (b.likes ? b.likes.length : 0) - (a.likes ? a.likes.length : 0));
            res.status(200).send(processed);
        })
        .catch(function(err) { res.status(400).send(err); });
});

/**
 * URL /commentsOfPhoto/:photoId 
 */
app.post('/commentsOfPhoto/:photo_id', function (request, response) {
    const photoId = request.params.photo_id;
    const userId = request.session.user_id;
    const commentText = request.body.comment;

    if (!userId) return response.status(401).send("Unauthorized");
    const mentionRegex = /@\[(.+?)\]\((.+?)\)/g;
    const mentions = [];
    let match;
    match = mentionRegex.exec(commentText);
    while (match !== null) {
        mentions.push(match[2]);
        match = mentionRegex.exec(commentText);
    }
    return Photo.findById(photoId).then(photo => {
        photo.comments.push({
            comment: commentText,
            user_id: userId,
            mentions: mentions
        });
        return photo.save();
    }).then(() => response.status(200).send())
      .catch(err => response.status(500).send(err));
});

/**
 * URL /photosOfMention/:id
 */
app.get('/photosOfMention/:id', function (request, response) {
    const userId = request.params.id;
    Photo.find({ "comments.mentions": userId })
        .then((photos) => {
            if (!photos || photos.length === 0) {
                return response.status(200).send([]);
            }
            const result = photos.map(photo => ({
                _id: photo._id,
                file_name: photo.file_name,
                user_id: photo.user_id 
            }));

            return response.status(200).send(result);
        })
        .catch((err) => {
            response.status(500).send(JSON.stringify(err));
        });
});

app.get('/commentsOfUser/:userId', async function (request, response) {
    const userId = request.params.userId;
    try {
        const photos = await Photo.find({})
            .populate({
                path: 'comments.user_id', 
                select: '_id first_name last_name'
            })
            .populate({
                path: 'user_id', 
                select: '_id first_name last_name'
            })
            .lean();
        let userComments = [];
        photos.forEach(photo => {
            if (photo.comments && Array.isArray(photo.comments)) {
                photo.comments.forEach(comment => {
                    if (comment.user_id && comment.user_id._id.toString() === userId) {
                        userComments.push({
                            _id: comment._id,
                            comment: comment.comment,
                            date_time: comment.date_time,
                            photo_id: photo._id,               
                            photo_file_name: photo.file_name,
                            photo_user_id: photo.user_id._id,    
                        });
                    }
                });
            }
        });
        response.status(200).send(userComments);
    } catch (err) {
        console.error('Error fetching comments of user:', err);
        response.status(500).send({ message: 'Internal Server Error' });
    }
});
/**
 * URL /deleteComment/:comment_id 
 */
app.post('/deleteComment/:comment_id', function (request, response) {
    const commentID = request.params.comment_id;
    const userID = request.session.user_id;
    if (!userID) return response.status(401).send("Unauthorized");
    return Photo.findOne({ "comments._id": commentID })
        .then(photo => {
            if (!photo) return response.status(404).send("Comment not found");
            const comment = photo.comments.id(commentID);
            if (comment.user_id.toString() !== userID) {
                return response.status(403).send("You can only delete your own comments");
            }
            comment.remove();
            return photo.save();
        })
        .then(() =>response.status(200).send("Comment deleted"))
        .catch(err => response.status(500).send(err));
});
/**
 * URL /photos/new 
 */
const upload = multer({ dest: 'uploads' });
app.post("/photos/new", upload.single("uploadedphoto"), function (request, response) {
    if (!request.file) return response.status(400).send("No file");
    const tempPath = request.file.path;
    const newFilename = request.file.filename + ".jpg";
    const targetPath = `./images/${newFilename}`;
    return fs.rename(tempPath, targetPath)
        .then(function() {
            const newPhoto = new Photo({
                file_name: newFilename,
                date_time: new Date(),
                user_id: request.session.user_id,
                comments: [],
            });
            return newPhoto.save();
        })
        .then(function(saved) { response.status(200).send(saved); })
        .catch(function(err) { response.status(500).send(err); });
});
/**
 * URL /deletePhoto/:photo_id
 */
app.post('/deletePhoto/:photo_id', function (request, response) {
    const photoId = request.params.photo_id;
    const userId = request.session.user_id;

    if (!userId) {
        return response.status(401).send("Нэвтрэх шаардлагатай");
    }

    return Photo.findById(photoId)
        .then((photo) => {
            if (!photo) {
                return response.status(404).send("Зураг олдсонгүй");
            }
            if (photo.user_id.toString() !== userId) {
                return response.status(403).send("Та зөвхөн өөрийн оруулсан зургийг устгах боломжтой");
            }
            return Photo.deleteOne({ _id: photoId });
        })
        .then(() => {
            response.status(200).send("Зураг амжилттай устлаа");
        })
        .catch((err) => {
            console.error("Error deleting photo:", err);
            response.status(500).send(err);
        });
});
/**
 * URL /user 
 */
app.post("/user", (request, response) => {
    const { login_name, password, first_name, last_name } = request.body;
    if (!login_name || !password || !first_name || !last_name) return response.status(400).send("Бүх талбарыг бөглө");
    return User.findOne({ login_name: login_name }).exec()
        .then(function(exists) {
            if (exists) return response.status(400).send("Exists");
            const newUser = new User({ login_name, password, first_name, last_name, location: request.body.location, description: request.body.description, occupation: request.body.occupation });
            return newUser.save();
        })
        .then(function(saved) { response.status(200).send(saved); })
        .catch(function(err) { response.status(500).send(err); });
});

/**
 * URL /deleteUser 
 */
app.post("/deleteUser", function (request, response) {
  const userId = request.session.user_id;
  if (!userId) {
    return response.status(401).send("Нэвтрэх шаардлагатай");
  }
  return Promise.all([
    Photo.deleteMany({ user_id: userId }), 
    Photo.updateMany(
      {},
      {
        $pull: {
          comments: { user_id: userId }, 
          likes: userId, 
        },
      }
    ),
    User.deleteOne({ _id: userId }), 
])
    .then(() => {
      request.session.destroy(function (err) {
        if (err) return response.status(500).send(err);
        return response.status(200).send("Account deleted successfully");
      });
    })
    .catch((err) => {
      console.error("Error during account deletion:", err);
      response.status(500).send(err);
    });
});

/**
 * URL /like/:photo_id - Like/Unlike
 */
app.post('/like/:photo_id', function (request, response) {
    const photoID = request.params.photo_id;
    const userID = request.session.user_id;
    Photo.findById(photoID).exec()
        .then(function(photo) {
            if (!photo) return response.status(404).send("Photo not found");
            const hasLiked = photo.likes && photo.likes.some(id => id.toString() === userID.toString());
            const op = hasLiked ? { $pull: { likes: userID } } : { $addToSet: { likes: userID } };
            return Photo.updateOne({ _id: photoID }, op);
        })
        .then(function() { response.status(200).send("Success"); })
        .catch(function(err) { response.status(500).send(err); });
});

const server = app.listen(3000, function () {
  const port = server.address().port;
  console.log(
    "Listening at http://localhost:" +
      port +
      " exporting the directory " +
      __dirname
  );
});