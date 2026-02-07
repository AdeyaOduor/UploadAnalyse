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
app.use('/uploads', express.static(uploadsDir));
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

// Serve script.js
app.get('/script.js', (req, res) => {
    const scriptPath = path.join(currentDir, 'script.js');
    if (fs.existsSync(scriptPath)) {
        res.sendFile(scriptPath);
    } else {
        res.status(404).send('script.js not found');
    }
});

// File upload endpoint with improved CSV parsing
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const results = [];
    let parseError = null;
    
    fs.createReadStream(req.file.path)
        .pipe(csv({
            mapHeaders: ({ header }) => header.trim(),
            mapValues: ({ value }) => value.trim()
        }))
        .on('data', (data) => {
            try {
                // Flexible column name handling
                const dateKey = Object.keys(data).find(key => 
                    key.toLowerCase().includes('date'));
                const quantityKey = Object.keys(data).find(key => 
                    key.toLowerCase().includes('quantity') || key.toLowerCase().includes('qty'));
                const revenueKey = Object.keys(data).find(key => 
                    key.toLowerCase().includes('revenue') || key.toLowerCase().includes('amount'));
                
                if (dateKey) {
                    const dateStr = data[dateKey];
                    const quantity = parseInt(data[quantityKey]) || 0;
                    const revenue = parseFloat(data[revenueKey]) || 0;
                    
                    // Parse date
                    let parsedDate;
                    try {
                        parsedDate = new Date(dateStr);
                        if (isNaN(parsedDate.getTime())) {
                            // Try common date formats
                            const parts = dateStr.split(/[/-]/);
                            if (parts.length === 3) {
                                if (parts[2].length === 4) {
                                    // Assume DD/MM/YYYY or MM/DD/YYYY
                                    parsedDate = new Date(parts[2], parts[1] - 1, parts[0]);
                                } else if (parts[0].length === 4) {
                                    // Assume YYYY/MM/DD
                                    parsedDate = new Date(parts[0], parts[1] - 1, parts[2]);
                                }
                            }
                        }
                    } catch (e) {
                        parsedDate = new Date();
                    }
                    
                    results.push({
                        date: parsedDate,
                        quantity: quantity,
                        revenue: revenue,
                        rawDate: dateStr
                    });
                }
            } catch (rowError) {
                console.warn('Error parsing row:', rowError);
            }
        })
        .on('end', () => {
            // Clean up temp file
            fs.unlink(req.file.path, err => {
                if (err) console.error('Error deleting temp file:', err);
            });
            
            // Sort by date
            results.sort((a, b) => a.date - b.date);
            
            // Calculate analytics
            const analytics = calculateAnalytics(results);
            
            res.json({ 
                success: true, 
                data: results,
                analytics: analytics
            });
        })
        .on('error', (error) => {
            parseError = error;
            res.status(500).json({ 
                success: false, 
                error: 'Error parsing CSV file', 
                details: error.message 
            });
        });
});

// Analytics calculation function
function calculateAnalytics(data) {
    if (!data || data.length === 0) {
        return {
            totalQuantity: 0,
            totalRevenue: 0,
            avgQuantity: 0,
            avgRevenue: 0,
            minQuantity: 0,
            maxQuantity: 0,
            minRevenue: 0,
            maxRevenue: 0
        };
    }
    
    const quantities = data.map(item => item.quantity);
    const revenues = data.map(item => item.revenue);
    
    const totalQuantity = quantities.reduce((a, b) => a + b, 0);
    const totalRevenue = revenues.reduce((a, b) => a + b, 0);
    const avgQuantity = totalQuantity / data.length;
    const avgRevenue = totalRevenue / data.length;
    const minQuantity = Math.min(...quantities);
    const maxQuantity = Math.max(...quantities);
    const minRevenue = Math.min(...revenues);
    const maxRevenue = Math.max(...revenues);
    
    return {
        totalQuantity,
        totalRevenue,
        avgQuantity,
        avgRevenue,
        minQuantity,
        maxQuantity,
        minRevenue,
        maxRevenue
    };
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
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
        error: 'Internal server error',
        message: err.message 
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`Upload directory: ${uploadsDir}`);
});