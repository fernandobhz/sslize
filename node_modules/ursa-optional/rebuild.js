var cp = require('child_process');
var p = cp.spawnSync('npm', ['run', 'rebuild']);
if (p.status || p.signal) {
  console.log('ursaNative bindings compilation fail. This is not an issue. Modules that depend on it will use fallbacks.');
  var fs = require('fs');
  fs.writeFileSync('./stdout.log', p.stdout);
  fs.writeFileSync('./stderr.log', p.stderr);
}

