const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists (use persistent volume if available)
const uploadDir = fs.existsSync('/data') ? '/data/uploads' : path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'item-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, webp) are allowed'));
    }
}).array('images', 5);

const uploadItemImage = (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.error('Upload error: ' + err.message, null, 400);
        } else if (err) {
            return res.error(err.message, null, 400);
        }

        if (!req.files || req.files.length === 0) {
            return res.error('No files selected', null, 400);
        }

        // Return the relative URLs for public access
        const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
        res.success({ image_urls: imageUrls }, 'Images uploaded successfully');
    });
};

module.exports = {
    uploadItemImage
};
