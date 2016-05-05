var NwBuilder = require("nw-builder");
var nw = new NwBuilder({
    files: ['assets/*', 'fonts/*', '*.html', '*.css', 'index.js', 'default-plugins.js', 'package.json', 'ntcore_node.node'],
    platforms: ['win64'],
    version: '0.14.1',
    zip: false,
    winIco: 'assets/favicon.ico'
});

//Log stuff you want

nw.on('log', console.log);

// Build returns a promise
nw.build().then(function () {
    console.log('all done!');
}).catch(function (error) {
    console.error(error);
});