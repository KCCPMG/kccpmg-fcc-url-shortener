'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('dns');



var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 




mongoose.connect(process.env.MONGOLAB_URI, 
                 {useNewUrlParser: true,
                 dbName: "urls",
                 useUnifiedTopology: true}
                );

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("They're Connected!");
})




app.use(cors());


/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: true}));



app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


// Create Mongo Schema for URL
var urlSchema = new mongoose.Schema({
  url : {
    type: String,
    required: true
  }, 
  num : {
    type: Number,
    required: true
  }
})

var Url = mongoose.model("url", urlSchema);


app.post("/api/shorturl/new/", function (req, res) {
  let url_in = req.body.url;
  
  if (url_in.slice(0, 8) === "https://") {
    dns.lookup(url_in.slice(8), checkForUrl);
  } else {
    res.json({"error": "invalid url"})
  }
    
  function checkForUrl (err, address, family) {
    if (err) res.json({"error" : "invalid hostname"});
    else {
      // check if url is in database
      Url.find({"url" : url_in}, (err, data) => {
        if (data.length === 1) {
          let foundUrl = data[0];
          res.json({"original url" : foundUrl.url, "short url" : foundUrl.num})
        } else {
          getNextIndex();
        }
      });
    }  
  }
  
  function getNextIndex() {
    Url.find({}).sort('-num').limit(1).exec((err, data) => {
      if (err) console.log(err);
      else {
        let index;
        if (data.length > 0) index = data[0].num+1;
        else index = 1;
        let new_dict = new Url({
          "url": url_in,
          "num" : index
        });
        new_dict.save();
        res.json({"original url" : url_in, "short url" : index});
      }
    })
  }
  
});





app.get("/api/shorturl/:num", function(req, res) {
  let num = req.params.num;
  Url.find({"num" : num}, (err, data) => {
    if (data.length === 0) {
      res.json({"error":"No short url found for given input"});    
    } else {
      let result = data[0];
      let new_url = result.url;
      res.redirect(new_url);
    }
  })
  
  
  
  
})



app.listen(port, function () {
  console.log('Node.js listening ...');
});