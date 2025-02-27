const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

const sheets = google.sheets('v4');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const client_email = process.env.GOOGLE_CLIENT_EMAIL;
const private_key = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'); // Fix multi-line key issue

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Authenticate Google API
const authenticate = async () => {
    const auth = new google.auth.JWT(
        client_email,
        null,
        private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
    );
    return auth;
};

// Endpoint to handle form submission
app.post('/submit', async (req, res) => {
    const formData = req.body;

    const requiredFields = ['name', 'email', 'phone', 'address', 'date', 'time', 'service'];
    for (let field of requiredFields) {
        if (!formData[field]) {
            return res.status(400).json({ success: false, error: `Missing field: ${field}` });
        }
    }

    try {
        const auth = await authenticate();

        const values = [[
            formData.name, formData.email, formData.phone, 
            formData.address, formData.date, formData.time, formData.service
        ]];

        await sheets.spreadsheets.values.append({
            auth, // Include authentication
            spreadsheetId: SPREADSHEET_ID,
            range: 'customer tracking!A1', // Update to your sheet range
            valueInputOption: 'RAW',
            requestBody: { values }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error writing to sheet:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
