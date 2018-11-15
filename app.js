const firebase = require("firebase")
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Chatkit = require("@pusher/chatkit-server");

const app = express();
const {firebaseConfig, CHATKIT_INSTANCE_LOCATOR, CHATKIT_SECRET_KEY} = require('./keys');
firebase.initializeApp(firebaseConfig);

// const firebaseDBHelloWorld = `${firebase.database().ref().once("value", (snap) => {console.log(snap.val())})}`;

const chatkit = new Chatkit.default({
  instanceLocator: CHATKIT_INSTANCE_LOCATOR,
  key: CHATKIT_SECRET_KEY
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// app.post("/users", (req, res) => {
//   const { username } = req.body;
//   firebase.database().ref().once("value", (snapshot) => {
//     var d = snapshot.val();
//     var {name} = d.Users[username].profile;
//     chatkit
//     .createUser({
//       id: username,
//       name: name
//     })
//     .then(() => {
//       console.log(`User created: ${username}`);
//       res.sendStatus(201);
//     })
//     .catch(err => {
//       if (err.error === "services/chatkit/user_already_exists") {
//         console.log(`User already exists: ${username}`);
//         res.sendStatus(200);
//       } else {
//         res.status(err.status).json(err);
//       }
//     });
//     return null
//   })
  
// });

app.post("/authenticate", (req, res) => {
  const authData = chatkit.authenticate({ userId: req.query.user_id });
  res.status(authData.status).send(authData.body);
});

app.get('/', (req, res) => res.send('I exist to fulfill a specific role in the authentication flow for chatkit users. \n Imad Rajwani is my lord and master. \n email: imadrajwani@gmail.com'))


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3003;
}

// let port = 3003;

app.listen(port, err => {
  if (err) {
    console.log(err);
  } else {
    console.log(`Running on port ${port}`);
  }
});