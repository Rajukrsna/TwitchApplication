const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Your Twitch credentials (make sure to replace these with your real tokens and client IDs)


app.use(cors());
app.use(express.json());

const twitchApi = axios.create({
    baseURL: 'https://api.twitch.tv/helix/',
    headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${process.env.TWITCH_OAUTH_TOKEN}`
    }
});

// Route to get top games
app.get('/api/top-games', async (req, res) => {
    try {
        const response = await twitchApi.get('games/top');
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching top games' });
    }
});

// Route to get streamers by game
app.get('/api/streams', async (req, res) => {
    const { game_id } = req.query;
    try {
        const response = await twitchApi.get(`streams?game_id=${game_id}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching streams' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
