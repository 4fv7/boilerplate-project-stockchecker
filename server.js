"use strict";
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const apiRoutes = require("./routes/api.js");
const fccTestingRoutes = require("./routes/fcctesting.js");
const runner = require("./test-runner");
const helmet = require("helmet");
require("./db-connection");

const app = express();

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://code.jquery.com/jquery-3.7.1.min.js"],
      styleSrc: ["'self'"],
    },
  })
);

app.use("/public", express.static(process.cwd() + "/public"));

app.use(cors({ origin: "*" })); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Index page (static HTML)
app.route("/").get(function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API
apiRoutes(app);

//404 Not Found Middleware
app.use(function (req, res, next) {
  res.status(404).type("text").send("Not Found");
});

// Global error-handling middleware
app.use(function (err, req, res, next) {
  console.error("Unhandled Error:", err.stack); // Log the error stack
  res.status(500).json({ error: "Internal Server Error" });
});

//Start our server and tests!
try {
  app.listen(process.env.PORT || 3000, function () {
    console.log("Listening on port " + (process.env.PORT || 3000));
    if (process.env.NODE_ENV === "test") {
      console.log("Running Tests...");
      setTimeout(function () {
        try {
          runner.run();
        } catch (e) {
          console.error("Tests failed to run:");
          console.error(e); // Log the error but do not stop the server
        }
      }, 3500);
    }
  });
} catch (err) {
  console.error("Server failed to start:", err);
}

module.exports = app;