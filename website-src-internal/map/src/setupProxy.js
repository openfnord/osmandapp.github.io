const { createProxyMiddleware } = require('http-proxy-middleware');
module.exports = function (app) {
    let proxy = createProxyMiddleware({
        target: 'http://localhost:8080/',
        //target: 'http://test.osmand.net/',
        changeOrigin: true,
        hostRewrite: 'localhost:3000',
        logLevel: 'debug'
    });
    app.use('/mapapi/', proxy);
    app.use('/routing/', proxy);
    app.use('/gpx/', proxy);
    app.use('/tile/', proxy);
    app.use('/weather/', proxy);
};
