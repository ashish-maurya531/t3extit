const { connect } = require('getstream');
const bcrypt = require('bcrypt');
const StreamChat = require('stream-chat').StreamChat;
const crypto = require('crypto');

require('dotenv').config();

const api_key = process.env.STREAM_API_KEY;
const api_secret = process.env.STREAM_API_SECRET;
const app_id = process.env.STREAM_APP_ID;

const signup = async (req, res) => {
    try {
        const { fullName, username, password, phoneNumber } = req.body;

        const userId = crypto.randomBytes(16).toString('hex');

        const serverClient = connect(api_key, api_secret, app_id);

        const hashedPassword = await bcrypt.hash(password, 10);

        const token = serverClient.createUserToken(userId);
        console.log(token, hashedPassword, serverClient, userId);
        res.status(200).json({status: 200, token,  username, userId, hashedPassword, phoneNumber, message: 'Signup Successfully' });
    } catch (error) {
        console.log(error);

        return res.json({status: 401,message: error.message});
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const serverClient = connect(api_key, api_secret, app_id);
        const client = StreamChat.getInstance(api_key, api_secret);

        const { users } = await client.queryUsers({ name: username });

        if(!users.length) return res.json({status: 401, message: 'User not found' });

        const success = await bcrypt.compare(password, users[0].hashedPassword);

        const token = serverClient.createUserToken(users[0].id);

        if(success) {
            res.json({status: 200, token, fullName: users[0].fullName, username, userId: users[0].id , message: 'login successfully!!' });
        } else {
            res.json({status: 401,  message: 'Incorrect password' });
        }
    } catch (error) {
        return res.json({status: 401, message: error.message});

    }
};

module.exports = { signup, login }