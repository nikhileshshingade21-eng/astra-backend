const Redis = require('ioredis');

async function clearCache() {
    return new Promise((resolve, reject) => {
        const client = new Redis(process.env.REDIS_URL, {
            tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
        });

        client.del('astra_cache:campus_zones_all', (err, result) => {
            if (err) {
                console.error(err);
                return reject(err);
            }
            console.log('Cache cleared successfully. Deleted keys:', result);
            client.quit();
            resolve();
        });
    });
}

clearCache().catch(console.error);
