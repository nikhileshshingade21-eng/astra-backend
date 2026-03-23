require('dotenv').config();
console.log('Dotenv loaded');
try {
    const { getDb } = require('./db.js');
    console.log('db.js loaded successfully');
} catch (e) {
    console.log('db.js load ERROR:', e.message);
    console.log('Stack:', e.stack);
}
