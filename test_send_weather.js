require('dotenv').config();
const { checkWeatherAlerts } = require('./services/smartNotifyService');

async function pushWeatherNow() {
    console.log('Fetching live weather and triggering ASTRA Smart Notification module...');
    try {
        await checkWeatherAlerts();
        console.log('✅ Weather notification dispatched to eligible users.');
    } catch (e) {
        console.error('❌ Failed to push weather:', e);
    }
    setTimeout(() => process.exit(0), 3000); // Give FCM a few seconds to flush
}

pushWeatherNow();
