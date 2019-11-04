const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const graphqlHttp = require('express-graphql');

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middleware/is-auth');

const { clearImage } = require('./util/file');


const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + "-" + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
      cb(null, true);
  } else {
      cb(null, false);
  }
};

const MONGODB_URI =
  "mongodb+srv://Amr:5atHdRfawry443r00flqp@cluster0-0wpw9.mongodb.net/messages";


app.use(bodyParser.json()); //application/json

app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));

app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if(req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(auth);

app.put('/post-image', (req, res, next) => {
  if(!req.isAuth) {
    throw new Error('Not Authenticated');
  }
  if(!req.file) {
    return res.status(200).json({message: 'No File Provided!'});
  }
  if(req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res.status(201).json({message: 'File Stored', filePath: req.file.path});
});


app.use('/graphql', graphqlHttp({
  schema: graphqlSchema,
  rootValue: graphqlResolver,
  graphiql: true,
  customFormatErrorFn(err) {
    if (!err.originalError) {
        return err;
    }
    const data = err.originalError.data;
    const message = err.message || 'An error Occurred!';
    const code = err.originalError.code || 500;
    return { message: message, status: code, data: data };
  }
}));

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});


mongoose
  .connect(MONGODB_URI)
  .then(result => {
    app.listen(8080);
  })
  .catch(err => console.log(err));

