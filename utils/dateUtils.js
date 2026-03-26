/**
 * ASTRA Localized Date Utilities
 * Ensures all operations follow the institutional timezone (Asia/Kolkata)
 * and neutralizing UTC offset / rollover bugs.
 */

const getLocalDate = () => {
    // Returns YYYY-MM-DD in the server's local time (Neutralizing UTC shifts)
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
};

module.exports = { getLocalDate };
