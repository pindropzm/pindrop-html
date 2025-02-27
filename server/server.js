const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

const sheets = google.sheets('v4');

const { SPREADSHEET_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

if (!SPREADSHEET_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error("❌ Missing required environment variables. Check your .env file.");
    process.exit(1); // Stop the server if env variables are missing
}

// Fix multi-line key issue
const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Authenticate Google API
const authenticate = async () => {
    try {
        const auth = new google.auth.JWT(
            GOOGLE_CLIENT_EMAIL,
            null,
            privateKey,
            ['https://www.googleapis.com/auth/spreadsheets']
        );
        await auth.authorize();
        console.log("✅ Google Sheets API authenticated successfully.");
        return auth;
    } catch (err) {
        console.error("❌ Google authentication failed:", err.message);
        throw err;
    }
};

// Endpoint to handle form submission
app.post('/submit', async (req, res) => {
    const formData = req.body;

    if (typeof formData !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid form data format' });
    }

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
            auth, 
            spreadsheetId: SPREADSHEET_ID,
            range: 'customer tracking!A1', 
            valueInputOption: 'RAW',
            requestBody: { values }
        });

        res.json({ success: true, message: "Data submitted successfully." });
    } catch (error) {
        console.error("❌ Error writing to sheet:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Start the server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
