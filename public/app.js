const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const currentDir = process.cwd();
const uploadsDir = path.join(currentDir, 'uploads');

// Enable CORS and middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(currentDir));

// Create uploads directory
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer file upload settings
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('text/csv') || path.extname(file.originalname) === '.csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        server: 'Sales Analytics Dashboard',
        directory: currentDir,
        timestamp: new Date().toISOString(),
        endpoints: { upload: 'POST /upload', health: 'GET /health', home: 'GET /' }
    });
});

// Serve index.html
app.get('/', (req, res) => {
    const indexPath = path.join(currentDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html not found');
    }
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            results.push({
                date: data.Date || '',
                quantity: parseInt(data.Quantity) || 0,
                revenue: parseInt(data.Revenue) || 0
            });
        })
        .on('end', () => {
            fs.unlink(req.file.path, err => {
                if (err) console.error('Error deleting temp file:', err);
            });
            res.json({ success: true, data: results });
        })
        .on('error', (error) => {
            res.status(500).json({ success: false, error: 'Error parsing CSV file', details: error.message });
        });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});