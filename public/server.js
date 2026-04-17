const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from current directory
app.use(express.static(__dirname));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            path.extname(file.originalname).toLowerCase() === '.csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Helper function to parse date
function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') {
        return new Date().toLocaleDateString();
    }
    
    dateStr = dateStr.trim();
    
    // Try different date formats
    const formats = [
        { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: ['day', 'month', 'year'] },
        { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, order: ['day', 'month', 'year'] },
        { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, order: ['year', 'month', 'day'] }
    ];
    
    for (const format of formats) {
        const match = dateStr.match(format.regex);
        if (match) {
            let year, month, day;
            if (format.order[0] === 'day') {
                day = parseInt(match[1]);
                month = parseInt(match[2]) - 1;
                year = match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3]);
            } else {
                year = parseInt(match[1]);
                month = parseInt(match[2]) - 1;
                day = parseInt(match[3]);
            }
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString();
            }
        }
    }
    
    return dateStr;
}

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        console.log(`Processing file: ${req.file.originalname}`);
        
        const results = [];
        
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                try {
                    // Try to find date, quantity, and revenue fields (case-insensitive)
                    const dateField = Object.keys(data).find(key => 
                        key.toLowerCase().includes('date'));
                    const quantityField = Object.keys(data).find(key => 
                        key.toLowerCase().includes('quantity'));
                    const revenueField = Object.keys(data).find(key => 
                        key.toLowerCase().includes('revenue'));
                    
                    if (dateField && quantityField && revenueField) {
                        const row = {
                            date: parseDate(data[dateField]),
                            quantity: parseInt(data[quantityField]) || 0,
                            revenue: parseFloat(data[revenueField]) || 0
                        };
                        
                        if (row.quantity > 0 || row.revenue > 0) {
                            results.push(row);
                        }
                    }
                } catch (error) {
                    console.log('Error parsing row:', error.message);
                }
            })
            .on('end', () => {
                // Clean up uploaded file
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting temp file:', err);
                });

                if (results.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'No valid data found in CSV file. Please ensure your CSV has Date, Quantity, and Revenue columns.'
                    });
                }

                res.json({
                    success: true,
                    message: `Successfully processed ${results.length} records`,
                    data: results
                });
            })
            .on('error', (error) => {
                console.error('CSV parsing error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error parsing CSV file'
                });
            });
            
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during file processing'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'Analytics Dashboard',
        timestamp: new Date().toISOString()
    });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: `File upload error: ${err.message}`
        });
    }
    
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════════╗
    ║    🚀 Analytics Dashboard Server Started!     ║
    ╠═══════════════════════════════════════════════╣
    ║  📍 Local:    http://localhost:${PORT}        ║
    ║  📍 Health:   http://localhost:${PORT}/health ║
    ║  📁 Upload:   POST /upload                    ║
    ╚═══════════════════════════════════════════════╝
    `);
});