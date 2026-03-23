try {
  require('./server.js');
} catch (err) {
  require('fs').writeFileSync('err_dump.txt', err.stack);
}
