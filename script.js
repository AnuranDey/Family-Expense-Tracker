const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const { randomUUID } = require("crypto");
const { version } = require("os");
const session = require("express-session");
const application = express();
const MongoDBStore = require("connect-mongodb-session")(session);

application.listen(3000, () => {
  console.log("Server up and running...");
});

// connecting mongoose to the mongodb database and handling errors, if any
mongoose
  .connect("mongodb://127.0.0.1:27017/myApplication") //returns a promise
  .then(() => console.log("CONNECTION ESTABLISHED")) //handling the promise
  .catch((err) => console.log(`ERROR ------------${err}`));

// defining schema for collection - credentials

const accSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  accountKey: {
    type: String,
    required: true,
  },
});

// defining schema for collection - information
const infoSchema = new mongoose.Schema({
  accountKey: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  details: {
    type: [{}],
  },
});

// defining the model class - credentials
const accModel = mongoose.model("credentials", accSchema);

// defining the model class - information
const infoModel = mongoose.model("information", infoSchema);

// enabling parser --  parses(interprets and transforms into readable format) data sent through POST routes
application.use(express.urlencoded({ extended: true }));
application.use(express.static(path.join(__dirname, "templates/version")));

// settings for setting up sessions
application.use(
  session({
    store: new MongoDBStore({
      uri: "mongodb://127.0.0.1:27017/myApplication",
      collection: "sessions",
    }),
    secret: "mysecretkey",
    resave: true,
  })
);

// setting up template-engine -- helps in rendering dynamic html documents as response
application.set("view engine", "ejs");

// setting up directory for templates
application.set("views", path.join(__dirname, "/templates"));

// DEFINING ROUTES

// homepage
application.get("/", (request, response) => {
  response.render("homepage.ejs");
});

// signup page + signup logic
application
  .route("/signup")
  .get((request, response) => {
    if (!request.session.is_active) {
      response.render("version/signup.ejs");
    } else {
      response.redirect("/dashboard");
    }
  })
  .post(async (request, response) => {
    let { username, password, key } = request.body;
    // generating a key if key = 0
    if (!key) {
      key = randomUUID();
    }
    // hashing the password using bcrypt
    const hash = await bcrypt.hash(password, 12);
    // storing the password in database
    const newCred = new accModel({
      username: username,
      password: hash,
      accountKey: key,
    });
    newCred.save();
    const newInfo = new infoModel({
      accountKey: key,
      username: username,
      details: [],
    });
    newInfo.save();
    response.redirect("/login");
  });

// login page
application
  .route("/login")
  .get((request, response) => {
    console.log(request.session);
    console.log(request.sessionID);
    if (!request.session.is_active) {
      response.render("version/login.ejs");
    } else {
      response.redirect("/dashboard");
    }
  })
  .post(async (request, response) => {
    const { username, password: pass } = request.body;
    const [obj] = await accModel.find({ username: username });
    const { password } = obj;
    const verified = await bcrypt.compare(pass, password);
    if (verified) {
      request.session.is_active = true;
      request.session.username = username;
      response.redirect("/dashboard");
    } else {
      response.send("Credentials mismatch");
    }
  });

application
  .route("/dashboard")
  .get(async (request, response) => {
    if (request.session.is_active) {
      const [{ details }] = await infoModel.find({
        username: request.session.username,
      });
      response.render("version/dashboard.ejs", {
        details: details,
        username: request.session.username,
      });
    } else {
      response.redirect("/login");
    }
  })
  .post(async (request, response) => {
    const data = request.body;
    const [obj] = await infoModel.find({ username: request.session.username });
    const { details } = obj;
    details.push(data);
    obj.save();
    response.redirect("/dashboard");
  });

application.get("/profile", async (request, response) => {});
