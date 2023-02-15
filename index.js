const express = require('express');
const cors = require('cors');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const passport = require('passport')
const { connect } = require('getstream');
const bcrypt = require('bcrypt');
const StreamChat = require('stream-chat').StreamChat;
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const authRoutes = require("./routes/auth.js");

let mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ashishanshumaurya1572002@gmail.com',
        pass: 'tagynegldomxfwff'
    }
});


const app = express();
const PORT = process.env.PORT || 5000;

require('dotenv').config();

const api_key = process.env.STREAM_API_KEY;
const api_secret = process.env.STREAM_API_SECRET;
const app_id = process.env.STREAM_APP_ID;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const twilioClient = require('twilio')(accountSid, authToken);
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "OPTIONS, GET, POST, PUT, PATCH, DELETE"
    );
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next(); // dont forget this
  });

app.use(cors());
app.use(express.json());
app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: "SECRET"
}))
app.use(express.urlencoded({extended: true}));
app.use(passport.initialize());
app.use(passport.session())

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

//   const client = StreamChat.getInstance(api_key);

  passport.use(new GoogleStrategy({
    clientID: "528481065357-pu699i47phtd5dq22dtp8o1ft84llgn3.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: "hhttps://63ed4afac0c87607476058c7--super-ganache-ea5ef6.netlify.app/auth/google/callback",
    proxy:true
  },
  async function(token, tokenSecret, email, done){
    var profile = email
    console.log("profile: " + profile["id"], profile.emails)
    const client = StreamChat.getInstance(api_key, api_secret);
console.log("name", profile.name.familyName+profile.name.givenName)
    const { users } = await client.queryUsers({ name: profile.name.familyName+profile.name.givenName });
console.log("users", users)
    if(users.length === 0){
        console.log(profile.emails[0].value)
        const fullName = profile.displayName || "";
        const username = profile.name.familyName+profile.name.givenName || "";
        const password = Math.random().toString(36).slice(2, 10)+"@73X717";
            const userId = crypto.randomBytes(16).toString('hex');
            const serverClient = connect(api_key, api_secret, app_id);
            const hashedPassword = await bcrypt.hash(password, 10);
            const token = serverClient.createUserToken(userId);
            const photo = profile.photos[0].value
            client.connectUser({
                id: userId,
                name: username,
                fullName: fullName,
                image: photo,
                hashedPassword: hashedPassword,
                phoneNumber: '1234567890',
            }, token)
        console.log(token, hashedPassword, serverClient, userId);

            // const reponse = await serverClient.connectUser({fullName, username, password})
            let mailDetails = {
                from: 'ashishanshumaurya1572002@gmail.com',
                to: profile.emails[0].value,
                subject: 'Hello from Text IT',
                html: `
                <p><strong>Your Username : </strong></p><h1>${username}</h1> 
                <p><strong>Your Password : </strong></p><h1>${password}</h1> 
                <p style="color: red"> Note* - Please Login with above Credentials </p>'
                <h3>Thank You!!</h3>
                `
            };
            mailTransporter.sendMail(mailDetails, function(err, data) {
                console.log(data)
                if(err) {
                    console.log('Error Occurs');
                } else {
                    console.log('Email sent successfully');
                }
            });

    }

    
    return done(null, email)   
  }
  ))

  app.get('/auth/google', 
  passport.authenticate('google', {scope: ['https://www.googleapis.com/auth/plus.login', 'profile', 'email']}),
  );

  app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/'}),
function(err, res) {
    res.redirect('/');
}
  )



app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.post('/', (req, res) => {
    const { message, user: sender, type, members } = req.body;

    if(type === 'message.new') {
        members
            .filter((member) => member.user_id !== sender.id)
            .forEach(({ user }) => {
                if(!user.online) {
                    twilioClient.messages.create({
                        body: `You have a new message from ${message.user.fullName} - ${message.text}`,
                        messagingServiceSid: messagingServiceSid,
                        to: user.phoneNumber
                    })
                        .then(() => console.log('Message sent!'))
                        .catch((err) => console.log(err));
                }
            })

            return res.status(200).send('Message sent!');
    }

    return res.status(200).send('Not a new message request');
});

app.use('/auth', authRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));