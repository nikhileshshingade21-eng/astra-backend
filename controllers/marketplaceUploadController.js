const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
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
}).single('image');

const uploadItemImage = (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.error('Upload error: ' + err.message, null, 400);
        } else if (err) {
            return res.error(err.message, null, 400);
        }

        if (!req.file) {
            return res.error('No file selected', null, 400);
        }

        // Return the relative URL for public access
        const imageUrl = `/uploads/${req.file.filename}`;
        res.success({ image_url: imageUrl }, 'Image uploaded successfully');
    });
};

module.exports = {
    uploadItemImage
};
