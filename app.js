const admin = require("firebase-admin");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Chatkit = require("@pusher/chatkit-server");

const app = express();

const {firebaseAdminConfig, CHATKIT_INSTANCE_LOCATOR, CHATKIT_SECRET_KEY} = require('./keys');
admin.initializeApp(firebaseAdminConfig);

// const firebaseDBHelloWorld = `${firebase.database().ref().once("value", (snap) => {console.log(snap.val())})}`;
// function onlyUnique(value, index, self) { 
//   return self.indexOf(value) === index;
// };
// a and b are javascript Date objects
function dateDiffInDaysGreaterThanThree(a, b) {
  if(a) {
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    var diff = Math.floor((utc2 - utc1) / 1000 * 60 * 60 * 24); //divide diff in milliseconds between dates by milliseconds per day

    if(diff>3) {
      return true
    } else {
      return false
    }
  }
  else {
    return false
  }
}

const chatkit = new Chatkit.default({
  instanceLocator: CHATKIT_INSTANCE_LOCATOR,
  key: CHATKIT_SECRET_KEY
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// app.use((req, res) => {
//   res.writeHead(200);
//   res.end("hello world\n");
// })

app.get("/populateConversations", (req, res) => {
  admin.database().ref().once('value', (snapshot) => {
    var d = snapshot.val();
    var users = Object.keys(d.Users);
    users.forEach((user_id) => {
      chatkit.getUserRooms({
        userId: user_id,
      })
        .then((rooms) => {

          if(rooms.length < 1) {
            console.log('user does not have rooms');
          }

          else {
            rooms.forEach( (room, index) => {
              if(!index) {
                console.log('skipping Users Room')
              }
              else {
  
                chatkit.getRoomMessages({
                  roomId: room.id,
                  direction: "newer",
                  limit: 1
                })
                .then( (roomMessages) => {
                  var lastMessageText = false, lastMessageSenderIdentification = false, lastMessageDate = false;
                  if(roomMessages.length > 0) {
                    lastMessageText = (roomMessages['0'].text).substr(0,40);
                    lastMessageDate = new Date(roomMessages['0'].updated_at).getDay();
                    lastMessageSenderIdentification = roomMessages['0'].user_id;
                  }
                  var buyerIdentification = room.created_by_id;
                  var buyer = d.Users[buyerIdentification].profile.name;
                  var buyerAvatar = d.Users[buyerIdentification].profile.uri;
                  var sellerIdentification = room.member_user_ids.filter( (id) => id != buyerIdentification )[0];
                  var seller = d.Users[sellerIdentification].profile.name;
                  var sellerAvatar = d.Users[sellerIdentification].profile.uri;
                  var productIdentification = room.name.split(".")[0];
                  var productImageURL = d.Users[sellerIdentification].products[productIdentification].uris[0]
                  var obj = { 
                    productSellerId: sellerIdentification, productImageURL: productImageURL, 
                    createdByUserId: buyerIdentification, name: room.name, id: room.id, 
                    buyerIdentification, sellerIdentification,
                    seller: seller, sellerAvatar: sellerAvatar, 
                    buyer: buyer, buyerAvatar: buyerAvatar,
                    lastMessageText, lastMessageDate, lastMessageSenderIdentification
                  };
                  var updates = {};
                  updates['Users/' + buyerIdentification + '/conversations/' + room.id + '/' ] = obj
                  admin.database().ref().update(updates);
                  updates['Users/' + sellerIdentification + '/conversations/' + room.id + '/' ] = obj
                  admin.database().ref().update(updates);
  
                })
                .catch( err => console.log(error) )
  
                
  
              }
              
              
            }
  
            )
          }
          
          



          // console.log(rooms);
        }).catch((err) => {
          console.error(err);
        });
    } )


    // chatkit.getRooms({})
    // .then((rooms) => {
    //   rooms.forEach( (room) => {
  
    //   })
    //   res.send("rooms: " + rooms)
    //   console.log(rooms);
    // })
  })
  
  res.send("populating conversations");
})

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


//TODO: App crashes whenever /authenticate is pinged
app.post("/authenticate", (req, res) => {
  // console.log(chatkit, typeof chatkit);
  // res.send('yo')
  // const authData = chatkit.authenticate({ userId: req.query.user_id });
  // res.status(authData.status).send(authData.body);
  // res.send(authData.status + Object.keys(authData))
  // console.log('yo' + req.query.user_id)
  res.status(200).send('https://us1.pusherplatform.io/services/chatkit_token_provider/v1/7a5d48bb-1cda-4129-88fc-a7339330f5eb/token')
});

app.get("/clean", (req, res) => {
  admin.database().ref().once("value", (dataFromReference) => {
    var products = (dataFromReference.val()).Products;
    // console.log(Array.isArray(products), typeof products, products.length, products);
    var cleanedProducts = [];

    //PROCEDURES:

    //1. Remove items that have been sold for more than 3 days;

    // products.forEach((product, index) => {
    //   if(index == 0) {
    //     //but what if the product.dateSold property isnt there?
    //     product.sold && dateDiffInDaysGreaterThanThree(product.dateSold, new Date) ? null : cleanedProducts.push(product)
    //   }
    //   else {
    //     product.key == products[index - 1].key ? null : product.sold && dateDiffInDays(product.dateSold, new Date) > 3 ? null : cleanedProducts.push(product);
    //   }
    // })

    //2. Remove duplicate items

    cleanedProducts = products.length == 1 ? 
      products 
      : 
      products.filter( (product, index) => {!index || (product.key != products[index - 1].key) })
      
    console.log(cleanedProducts, cleanedProducts.length);
    var updates = {}
    updates['/Products/'] = cleanedProducts
    admin.database().ref().update(updates);
    res.send(cleanedProducts);
  })
  
});

//Delete comments of all users and all products
//.....


//Add a property to each product of dateSold: ''
app.get('/addDateSold', (req, res) => {
  admin.database().ref().once("value", (dataFromReference) => { 
    var products = (dataFromReference.val()).Products;
    var newProducts = products.map((product) => {
      delete product.dateSold;
      product.text.dateSold = '';
      return product;
    })
    // products = products.forEach( (product) => product['dateSold'] = '')
    // console.log(newProducts)
    // console.log(products[2].dateSold)
    var updates = {}
    updates['/Products/'] = newProducts
    admin.database().ref().update(updates);
  } )
})


// app.get()

app.get('/', (req, res) => {
  // pullFunds(res);
  res.send(
  'Hi, I exist to fulfill a specific role in the authentication flow for chatkit users. \n Imad Rajwani is my lord and master. \n email: imadrajwani@gmail.com'
  
  );
}
  )



let port = process.env.PORT;
if (port == null || port == "") {
  port = 3003;
}

app.listen(port, err => {
  if (err) {
    console.log(err);
  } else {
    console.log(`Running on port ${port}`);
  }
});


// https.createServer(options, app).listen(8080);