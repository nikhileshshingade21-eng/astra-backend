require('dotenv').config();
const { flushAll } = require('./services/cacheService.js');

async function doFlush() {
    console.log('Flushing cache...');
    await flushAll();
    console.log('Done.');
    process.exit(0);
}

doFlush().catch(console.error);
