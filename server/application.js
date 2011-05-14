var sys = require('sys'),
    http = require('http'),
    io = require('socket.io'),
    TwitterNode = require('twitter-node').TwitterNode;

var port = 8011,
    proxyPort = 8030,
    host = "127.0.0.1",
    username = "",
    password = "",
    tags = [];

// init HTTP server
var app = http.createServer(function(req, res) { 
    res.writeHead(200, {'Content-Type': 'text/html'}); 
    res.end('<h1>Hello world</h1>'); 
});
app.listen(port);

// init socket.io server
var socket = io.listen(app);

// create twitter-node
var twitter = new TwitterNode({
    user: username,
    password: password,
    track: tags
});

// hookup event listeer
twitter
.addListener('error', function(error) {
    console.log(error.message);
})
.addListener('tweet', function(tweet) {
    console.log(tweet);
    // push this into websocket
    socket.broadcast(tweet);
})
.addListener('end', function(resp) {
    console.log("Good bye");
});
twitter.stream();

// ###Implementation of the app
// Add a tag to the listening tags and reset Twitter Stream API
// Tag will be added to session
socket.on('connection', function(client){
    var connected = true;

    // receiving a new tag
    client.on('message', function(tag){
        console.log(tag);
        // Record the tag
        tags.push(tag);
        // Track this tag
        twitter.track(tag);
        // Reset the stream
        twitter.stream();
    });
    client.on('disconnect', function(){
        connected = false;
    });
});

