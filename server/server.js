require('dotenv').config(); // Make sure to load environment variables

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');

const sheets = google.sheets('v4');

// ✅ Ensure correct private key parsing
const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')  // Fixing the \n to actual newline
};

// Spreadsheet ID from .env
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Health check endpoint for Render
app.get('/healthz', (req, res) => {
    res.status(200).send('Service is healthy');
});

// Authenticate Google API
const authenticate = async () => {
    const auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
    );
    google.options({ auth });
};

app.post('/submit', async (req, res) => {
    const formData = req.body;
    try {
        await authenticate();

        const values = [[
            formData.name,
            formData.email,
            formData.phone,
            formData.address,
            formData.date,
            formData.time,
            formData.service,
            formData.site
        ]];

        const resource = { values };

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'customer tracking!A1',
            valueInputOption: 'RAW',
            resource
        });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error writing to sheet:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});
