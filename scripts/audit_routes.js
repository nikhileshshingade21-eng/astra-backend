const fs = require('fs');
const path = require('path');
function getRoutes(filepath) {
  let text = fs.readFileSync(filepath, 'utf8');
  let lines = text.split('\n');
  let routes = [];
  lines.forEach(line => {
    let m = line.match(/router\.(get|post|put|delete|patch)\(['"`](.+?)['"`]/);
    if(m) routes.push(`${m[1].toUpperCase()} ${m[2]}`);
  });
  return routes;
}
let backendRoutes = {};
const routeDir = 'd:/astra by antigravity/astra-backend/routes';
let files = fs.readdirSync(routeDir);
files.forEach(f => {
  backendRoutes[f] = getRoutes(path.join(routeDir, f));
});
console.log(JSON.stringify(backendRoutes, null, 2));
