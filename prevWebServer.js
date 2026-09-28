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

// XXX - Your submission should work without this line. Comment out or delete
// this line for tests and before submission!
//const cs142models = require("./modelData/photoApp.js").cs142models;
mongoose.set("strictQuery", false);
mongoose.connect("mongodb://127.0.0.1/cs142project6", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.json());
// We have the express static module
// (http://expressjs.com/en/starter/static-files.html) do all the work for us.
app.use(express.static(__dirname));
app.use(session({secret: "secretKey", resave: false, saveUninitialized: false}));
app.use(bodyParser.json());
app.use(async function(req, res, next) {
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

// Хэрэглэгчийн сүүлийн үйлдлийг тодорхойлох функц (Helper)
async function getLastActivity(userId) {
    // Хамгийн сүүлийн зураг
    const lastPhoto = await Photo.findOne({ user_id: userId }).sort({ date_time: -1 });
    // Хамгийн сүүлийн сэтгэгдэл
    const allPhotos = await Photo.find({ "comments.user_id": userId });
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

    // Аль нь илүү сүүлийнх болохыг харьцуулах
    if (lastPhoto && (!lastComment || lastPhoto.date_time > lastComment.date_time)) {
        return { type: "posted a photo", date_time: lastPhoto.date_time, file_name: lastPhoto.file_name };
    } else if (lastComment) {
        return lastComment;
    }
    return { type: "registered as a user", date_time: null }; // Анхдагч утга
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

app.post("/admin/login", async function (request, response) {
    const { login_name, password } = request.body;
    if (!login_name || !password) {
        return response.status(400).send("Нэвтрэх нэр, нууц үг хоёулаа шаардлагатай.");
    }
    try {
        const user = await User.findOne({ login_name: login_name });
        if (!user) {
            return response.status(400).send("Хэрэглэгчийн нэр эсвэл нууц үг буруу байна.");
        }
        if (user.password !== password) {
            return response.status(400).send("Хэрэглэгчийн нэр эсвэл нууц үг буруу байна.");
        }
        request.session.user_id = user._id;
        request.session.login_name = user.login_name;
        return response.status(200).send({
            _id: user._id,
            first_name: user.first_name,
            login_name: user.login_name
        });
    } catch (err) {
        console.error("Login error:", err);
        return response.status(500).send("Server error. Нэвтрэх боломжгүй.");
    }
});

app.post("/admin/logout", function (req, res) {
  if (!req.session.user_id) {
    return res.status(400).send("Not logged in");
  }
  req.session.destroy();
  return res.sendStatus(200);
});

/**
 * URL /user/list - Returns all the User objects.
 */
app.get("/user/list", async function (req, res) {
    try {
        const users = await User.find({}).select("_id first_name last_name").lean();
        
        // Хэрэглэгч бүрийн хувьд сүүлийн үйлдлийг нь олж нэмэх
        const usersWithActivity = await Promise.all(users.map(async (user) => {
            const lastActivity = await getLastActivity(user._id); // Бидний өмнө бэлдсэн Helper
            return {
                ...user,
                last_activity: lastActivity
            };
        }));

        res.status(200).send(usersWithActivity);
    } catch (err) {
        res.status(500).send("Server error");
    }
});

/*app.get("/user/:id", async function (req, res) {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).send("Хүчингүй хэрэглэгчийн ID (Invalid ObjectId).");
    }
    try {
        const user = await User.findById(userId)
            .select("_id first_name last_name location description occupation")
            .lean();
        if (!user) {
            return res.status(400).send("Хэрэглэгч олдсонгүй.");
        }
        /*const numPhotos = await Photo.countDocuments({ user_id: userId });
        const allPhotos = await Photo.find({}).select("comments");
        let totalComments = 0;
        allPhotos.forEach(photo => {
            if (photo.comments && Array.isArray(photo.comments)) {
                photo.comments.forEach(comment => {
                    if (comment.user_id.toString() === userId) {
                        totalComments++;
                    }
                });
            }
        });
        const userWithExtra = {
            ...user,
            num_photos: numPhotos,
            num_comments: totalComments
        };
        //return res.status(200).send(userWithExtra);
        return res.status(200).send(user);
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).send("Invalid UserId");
        }
        console.error("Error fetching user data:", err);
        return res.status(500).send("Server error");
    }
});*/

app.get("/user/:id", async function (req, res) {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).send("Хүчингүй хэрэглэгчийн ID.");
    }

    try {
        // 1. Хэрэглэгчийн үндсэн мэдээллийг авах
        const user = await User.findById(userId)
            .select("_id first_name last_name location description occupation")
            .lean();

        if (!user) {
            return res.status(400).send("Хэрэглэгч олдсонгүй.");
        }

        // 2. Хэрэглэгчийн нийт зургийн тоог авах
        const numPhotos = await Photo.countDocuments({ user_id: userId });

        // 3. Хэрэглэгчийн нийт бичсэн сэтгэгдлийн тоог тоолох
        const allPhotosForComments = await Photo.find({});
        let totalCommentsCount = 0;
        allPhotosForComments.forEach(photo => {
            if (photo.comments) {
                photo.comments.forEach(comment => {
                    if (comment.user_id.toString() === userId) {
                        totalCommentsCount++;
                    }
                });
            }
        });

        // 4. Хамгийн сүүлд оруулсан зургийг олох (Story 1-д зориулж)
        const recentPhoto = await Photo.findOne({ user_id: userId })
            .sort({ date_time: -1 })
            .select("_id file_name date_time")
            .lean();

        // 5. Хамгийн их сэтгэгдэлтэй зургийг олох (Story 1-д зориулж)
        const userPhotos = await Photo.find({ user_id: userId }).lean();
        let mostCommentedPhoto = null;
        let maxComments = -1;

        userPhotos.forEach(photo => {
            const commentCount = (photo.comments && Array.isArray(photo.comments)) ? photo.comments.length : 0;
            if (commentCount > maxComments) {
                maxComments = commentCount;
                mostCommentedPhoto = {
                    _id: photo._id,
                    file_name: photo.file_name,
                    comment_count: commentCount
                };
            }
        });

        // 6. Хэрэглэгчийн сүүлийн үйлдлийг тодорхойлох (Story 8-д зориулж)
        // Өмнө нь бичсэн туслах функцээ энд дуудаж байна
        const lastActivity = await getLastActivity(userId);

        // Бүх өгөгдлийг нэгтгэх
        const responseData = {
            ...user,
            num_photos: numPhotos,
            num_comments: totalCommentsCount,
            recent_photo: recentPhoto,
            most_commented_photo: mostCommentedPhoto,
            last_activity: lastActivity // Энэ утга UserList-д хэрэгтэй
        };

        return res.status(200).send(responseData);

    } catch (err) {
        console.error("Error fetching user detail:", err);
        return res.status(500).send("Server error");
    }
});

/*app.get("/photosOfUser/:id", async function (req, res) {
  const userId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid UserId");
  }
  try {
    const photos = await Photo.find({ user_id: req.params.id }).lean();
    if (!photos) { 
        return res.status(200).send([]);
    }
    const processedPhotos = await Promise.all(
      photos.map(async (p) => {
        const comments = await Promise.all(
          p.comments.map(async (c) => {
            const user = await User.findById(c.user_id)
              .select("_id first_name last_name")
              .lean();
            return {
              _id: c._id,
              comment: c.comment,
              date_time: c.date_time,
              user: user  
            };
          })
        );
        return {
          _id: p._id,
          file_name: p.file_name,
          date_time: p.date_time,
          user_id: p.user_id,
          comments: comments
        };
      })
    );
    return res.status(200).send(processedPhotos); 
  } catch (e) {
    console.error("Error fetching photos in /photosOfUser/:id:", e);
    return res.status(500).send("Error fetching photos from server."); 
  }
});*/

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

app.get("/photosOfUser/:id", async function (req, res) {
    // ... хэрэглэгчийн ID шалгах хэсэг
    try {
        let photos = await Photo.find({ user_id: req.params.id }).lean();
        
        // Story 6-ийн эрэмбэлэлт
        photos.sort((a, b) => {
            const likesA = a.likes ? a.likes.length : 0;
            const likesB = b.likes ? b.likes.length : 0;
            
            if (likesB !== likesA) {
                return likesB - likesA; // Лайкны тоогоор (Desc)
            }
            return new Date(b.date_time) - new Date(a.date_time); // Огноогоор (Desc)
        });

        res.status(200).send(photos);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/commentsOfPhoto/:photoId', async function (request, response) {
    const photoId = request.params.photoId;
    const commentText = request.body.comment;
    const userId = request.session.user_id; 
    if (!mongoose.Types.ObjectId.isValid(photoId)) {
        return response.status(400).send("Invalid Photo ID.");
    }

    if (!commentText || commentText.trim().length === 0) {
        return response.status(400).send("Comment text is required.");
    }
    try {
        const newComment = {
            comment: commentText,
            date_time: new Date(),
            user_id: userId
        };
        const photo = await Photo.findByIdAndUpdate(
            photoId,
            { $push: { comments: newComment } },
            { new: true, runValidators: true } 
        );
        if (!photo) {
            return response.status(400).send("Photo not found.");
        }
        return response.status(200).send({ message: "Comment added successfully." });
    } catch (err) {
        console.error("Error adding comment:", err);
        return response.status(500).send("Internal Server Error while saving comment.");
    }
});

const upload = multer({ dest: 'uploads' });

/*app.post("/photos", upload.single("uploadedphoto"), async function (request, response) {
    const user_id = request.session.user_id; 
    if (!user_id) {
        return response.status(401).send("Unauthorized");
    }
    if (!request.file) {
        return response.status(400).send("No file uploaded.");
    }
    const photo = request.file; 
    try {
        const tempPath = photo.path;
        const fileExtension = photo.originalname.split('.').pop();
        const newFilename = photo.filename + '.' + fileExtension;
        const targetPath = `./images/${newFilename}`; 
        await fs.rename(tempPath, targetPath);
        const newPhoto = new Photo({
            file_name: newFilename,
            date_time: new Date(),
            user_id: user_id,
            comments: [],
        });
        await newPhoto.save();
        return response.status(200).send({ message: "Photo uploaded successfully", photo: newPhoto });
    } catch (err) {
        console.error("Error during file upload and DB save:", err);
        return response.status(500).send("Server error during photo upload: " + err.message);
    }
});

app.post("/photos/new", upload.single("uploadedphoto"), async function (request, response) {
    const user_id = request.session.user_id; 
    if (!user_id) {
        return response.status(401).send("Unauthorized");
    }
    if (!request.file) {
        return response.status(400).send("No file uploaded.");
    }
    const photo = request.file;
    let newFilename = ''; 
    try {
        const tempPath = photo.path;
        const originalNameParts = photo.originalname ? photo.originalname.split('.') : [];
        const fileExtension = originalNameParts.length > 1 ? originalNameParts.pop() : 'jpg'; 
        newFilename = photo.filename + '.' + fileExtension; 
        const targetPath = `./images/${newFilename}`; 
        await fs.rename(tempPath, targetPath);
        const newPhoto = new Photo({
            file_name: newFilename,
            date_time: new Date(),
            user_id: user_id,
            comments: [],
        });
        const savedPhoto = await newPhoto.save(); 
        return response.status(200).send(savedPhoto); 
    } catch (err) {
        return response.status(500).send("Server error during photo upload: " + err.message);
    }
});*/

async function handlePhotoUpload(request, response) {
    const user_id = request.session.user_id;
    console.log("LOG 1");
    if (!user_id) {
        return response.status(401).send("Unauthorized");
    }
    if (!request.file) {
        return response.status(400).send("No file uploaded.");
    }
    const photo = request.file;
    const tempPath = photo.path;
    let newFilename = ''; 
    try {
        console.log(`LOG 2`);
        const originalNameParts = photo.originalname ? photo.originalname.split('.') : [];
        const fileExtension = originalNameParts.length > 1 ? originalNameParts.pop() : 'jpg'; 
        newFilename = photo.filename + '.' + fileExtension; 
        const targetPath = `./images/${newFilename}`; 
        await fs.rename(tempPath, targetPath);
        console.log("LOG 3");
        const newPhoto = new Photo({
            file_name: newFilename,
            date_time: new Date(),
            user_id: user_id,
            comments: [],
        });
        const savedPhoto = await newPhoto.save();
        console.log("LOG 4");
        if (request.originalUrl === '/photos/new') {
             console.log("LOG 5 yes");
            return response.status(200).send(savedPhoto); 
        } else {
             console.log("LOG 5 no");
            return response.status(200).send({ message: "Photo uploaded successfully", photo: savedPhoto }); 
        }
    } catch (err) {
        console.error("Error during file upload and DB save:", err);
        fs.unlink(tempPath).catch(unlinkErr => console.error("Error cleaning up temp file:", unlinkErr));
        return response.status(500).send("Server error during photo upload: " + err.message);
    }
}

app.post("/photos/new", upload.single("uploadedphoto"), handlePhotoUpload);

app.post("/photos", upload.single("uploadedphoto"), handlePhotoUpload);

app.post("/user", async function (request, response) {
    const { login_name, password, first_name, last_name, location, description, occupation } = request.body;
    console.log(login_name);
    console.log(password);
    console.log(first_name);
    console.log(last_name);
    console.log(location);
    console.log(description);
    console.log(occupation);
    
    if (!login_name || !password || !first_name || !last_name || 
        login_name.trim() === '' || password.trim() === '' || 
        first_name.trim() === '' || last_name.trim() === '') {
        return response.status(400).send("Нэвтрэх нэр, нууц үг, нэр, овог заавал шаардлагатай.");
    }
    try {
        const existingUser = await User.findOne({ login_name: login_name });
        if (existingUser) {
            return response.status(400).send(`"${login_name}" нэвтрэх нэр аль хэдийн бүртгэгдсэн байна.`);
        }
        const newUser = new User({
            login_name: login_name,
            password: password, 
            first_name: first_name,
            last_name: last_name,
            location: location || '',
            description: description || '',
            occupation: occupation || '',
        });
        const savedUser = await newUser.save();
        return response.status(200).send({
            _id: savedUser._id,
            login_name: savedUser.login_name,
            first_name: savedUser.first_name,
            last_name: savedUser.last_name,
        });
    } catch (err) {
        console.error("User registration error:", err);
        return response.status(500).send("Серверийн алдаа: Бүртгэл хийх боломжгүй.");
    }
});

// Зурагт лайк дарах
/*app.post("/like/:photo_id", async function (req, res) {
    const photoId = req.params.photo_id;
    const userId = req.session.user_id; // Нэвтэрсэн хэрэглэгчийн ID

    if (!userId) return res.status(401).send("Нэвтрэх шаардлагатай");

    try {
        const photo = await Photo.findById(photoId);
        if (!photo) return res.status(404).send("Зураг олдсонгүй");

        // Хэрэв өмнө нь лайк дараагүй бол нэмэх
        if (!photo.likes.includes(userId)) {
            photo.likes.push(userId);
            await photo.save();
        }
        return res.status(200).send();
    } catch (err) {
        return res.status(500).send(err);
    }
});*/
app.post('/like/:photo_id', function (request, response) {
    const photoID = request.params.photo_id;
    // Login хэсэгт request.session.user_id гэж хадгалсан тул ингэж авна:
    const userID = request.session.user_id; 

    if (!userID) {
        return response.status(401).send("Unauthorized");
    }

    return Photo.findById(photoID).exec()
        .then(function(photo) {
            if (!photo) return response.status(404).send("Photo not found");

            // Like нэмэх эсвэл хасах логик
            const hasLiked = photo.likes && photo.likes.some(id => id.toString() === userID.toString());
            const updateOperator = hasLiked ? { $pull: { likes: userID } } : { $addToSet: { likes: userID } };

            return Photo.updateOne({ _id: photoID }, updateOperator);
        })
        .then(function() {
            return response.status(200).send("Like updated successfully");
        })
        .catch(function(err) {
            console.error('Error updating like:', err);
            return response.status(500).send("Internal server error");
        });
});

// Лайк цуцлах (Unlike)
app.post("/unlike/:photo_id", async function (req, res) {
    const photoId = req.params.photo_id;
    const userId = req.session.user_id;

    if (!userId) return res.status(401).send("Нэвтрэх шаардлагатай");

    try {
        const photo = await Photo.findByIdAndUpdate(
            photoId,
            { $pull: { likes: userId } },
            { new: true } // Шинэчлэгдсэн өгөгдлийг буцаах
        );
        if (!photo) return res.status(404).send("Зураг олдсонгүй");

        // Хэрэглэгчийн ID-г массиваас хасах
        photo.likes = photo.likes.filter(id => id.toString() !== userId);
        await photo.save();
        return res.status(200).send();
    } catch (err) {
        return res.status(500).send(err);
    }
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