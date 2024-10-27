var express = require('express');
var session = require('express-session');
var passport = require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var request = require('request');
var path = require('path');

const TWITCH_CLIENT_ID = 'a72xnqzfno5rt4uhshm67sgzs8emr5';
const TWITCH_SECRET = 'dzybpv15veyhi5j9c22hf0jtsjsupr';
const SESSION_SECRET = 'secreat123';
const CALLBACK_URL = 'http://localhost:3000/auth/twitch/callback';

var app = express();
app.set('view engine', 'ejs');
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());

// Store user profile and access token securely
let accessToken = null;
let userId = null;
// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
  var options = {
    url: 'https://api.twitch.tv/helix/users',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Authorization': 'Bearer ' + accessToken,
    },
  };
  request(options, function (error, response, body) {
    if (response && response.statusCode == 200) {
      { const data = JSON.parse(body);
        userId = data.data[0].id;  // Store the user ID
        console.log(userId);
        done(null, JSON.parse(body));}
    } else {
      done(JSON.parse(body));
    }
  });
};

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use('twitch', new OAuth2Strategy({
  authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
  tokenURL: 'https://id.twitch.tv/oauth2/token',
  clientID: TWITCH_CLIENT_ID,
  clientSecret: TWITCH_SECRET,
  callbackURL: CALLBACK_URL,
  state: true
},
function(accessTokenRes, refreshToken, profile, done) {
  accessToken = accessTokenRes; // Store the access token in a variable
  done(null, profile);
}));


app.get('/auth/twitch', passport.authenticate('twitch', { 
  scope: ['user_read', 'channel:manage:polls']  // Add the required scope here
}));

// Set route for OAuth redirect
app.get('/auth/twitch/callback', passport.authenticate('twitch', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/dashboard');
});

// Dashboard with buttons
app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('dashboard.ejs');
  } else {
    res.redirect('/');
  }
});

// creating a poll
// Create a poll
app.post('/createPoll', async (req, res) => {
  try {
    const { title, choices, duration, channelPointsPerVote } = req.body;

    const pollData = {
      broadcaster_id: userId,
      title: title || "Default Poll Title",
      choices: choices || [{ title: "Choice 1" }, { title: "Choice 2" }],
      duration: duration || 300,
      channel_points_voting_enabled: !!channelPointsPerVote,
      channel_points_per_vote: channelPointsPerVote || 0
    };

    const response = await axios.post('https://api.twitch.tv/helix/polls', pollData, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Client-Id': CLIENT_ID,
        'Content-Type': 'application/json'
      }
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Game performance data
// Route to get game performance data
app.get('/gamePerformance', async (req, res) => {
  if (req.session && req.session.passport && req.session.passport.user) {
    const accessToken = req.session.passport.user.accessToken;
    
    // Replace this URL with the actual endpoint for fetching game performance data.
    const options = {
      url: 'https://api.twitch.tv/helix/some-game-performance-endpoint', // replace with actual endpoint
      method: 'GET',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': 'Bearer ' + accessToken
      }
    };

    request(options, function (error, response, body) {
      if (error) {
        console.error("Error fetching game performance data:", error);
        res.status(500).send("Error fetching game performance data");
      } else if (response.statusCode !== 200) {
        console.log("Failed to get game performance:", body);
        res.status(response.statusCode).send(body);
      } else {
        res.status(200).json(JSON.parse(body));
      }
    });
  } else {
    res.status(401).send("User not authenticated");
  }
});
// Additional routes for chat sentiment analysis, follower growth, etc., would follow a similar pattern


// Define a basic homepage for unauthenticated users
app.get('/', (req, res) => {
  res.send('<html><head><title>Twitch Auth Sample</title></head><a href="/auth/twitch"><img src="http://ttv-api.s3.amazonaws.com/assets/connect_dark.png"></a></html>');
});

app.listen(3000, function () {
  console.log('Twitch auth sample listening on port 3000!');
});
