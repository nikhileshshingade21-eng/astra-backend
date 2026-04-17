/**
 * ─────────────────────────────────────────────────────────────
 *  🚀 ASTRA Auto-Update Controller v2
 * ─────────────────────────────────────────────────────────────
 *  Manages institutional APK versioning with:
 *    - versionCode-based numeric comparison (reliable)
 *    - Force update flag for critical patches
 *    - Changelog delivery
 *    - APK download URL
 *
 *  Update Flow:
 *    1. Admin bumps these constants when releasing a new APK
 *    2. Frontend checks /api/system/version on launch
 *    3. If remote versionCode > local versionCode → show update
 *    4. APK is downloaded and installed natively
 * ─────────────────────────────────────────────────────────────
 */

// ── UPDATE THESE WHEN RELEASING A NEW VERSION ────────────────
const LATEST_VERSION_CODE = 3;                    // Increment this for each release
const LATEST_VERSION_NAME = '3.2.5';              // Human-readable version
const FORCE_UPDATE = false;                        // Set true for critical/security updates
const APK_DOWNLOAD_URL = 'https://github.com/nikhileshshingade21-eng/astra-releases/releases/download/latest/app-release.apk';
const CHANGELOG = `• Fixed notification tap handling — now opens correct screens
• Added background notification navigation support
• Improved app launch reliability
• Stability fixes for Students and Admin tools
• Security patch for registration exploits`;

const checkVersion = async (req, res) => {
    try {
        const { platform, currentVersion, currentVersionCode } = req.query;

        // Parse client version code (numeric comparison is most reliable)
        const clientCode = parseInt(currentVersionCode) || 0;

        // Determine if update is available
        const updateAvailable = clientCode < LATEST_VERSION_CODE;

        res.success({
            // Version info
            versionCode: LATEST_VERSION_CODE,
            versionName: LATEST_VERSION_NAME,
            latestVersion: LATEST_VERSION_NAME,    // Backward compat with old VersionChecker

            // Update flags
            updateAvailable,
            forceUpdate: FORCE_UPDATE && updateAvailable,

            // Download
            apkUrl: APK_DOWNLOAD_URL,
            downloadUrl: APK_DOWNLOAD_URL,         // Backward compat

            // Changelog
            changelog: CHANGELOG,
            releaseNotes: CHANGELOG,                // Backward compat
        });
    } catch (err) {
        console.error('[VersionController] Error:', err.message);
        res.error('Version check failed', null, 500);
    }
};

module.exports = {
    checkVersion
};
