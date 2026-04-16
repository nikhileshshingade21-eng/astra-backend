const fs = require('fs');
const path = require('path');
function findFiles(dir, cb) {
  let files = fs.readdirSync(dir);
  for(let f of files) {
    let full = path.join(dir, f);
    if(fs.statSync(full).isDirectory()) findFiles(full, cb);
    else cb(full);
  }
}

let apiCalls = [];
findFiles('d:/astra by antigravity/astra-rn/src', function(f) {
  if (f.endsWith('.js') || f.endsWith('.jsx')) {
    let text = fs.readFileSync(f, 'utf8');
    let fetchMatches = text.match(/fetchWithTimeout\([`'"].*?[`'"]/g) || [];
    let axiosMatches = text.match(/axios\..+?\([`'"].*?[`'"]/g) || [];
    let socketMatches = text.match(/\.emit\([`'"].*?[`'"]/g) || [];
    let socketOnMatches = text.match(/\.on\([`'"].*?[`'"]/g) || [];
    
    if (fetchMatches.length || axiosMatches.length || socketMatches.length || socketOnMatches.length) {
      apiCalls.push({file: f, fetchs: fetchMatches, axios: axiosMatches, socketOut: socketMatches, socketIn: socketOnMatches});
    }
  }
});
console.log(JSON.stringify(apiCalls, null, 2));
