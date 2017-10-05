const transcode = require('./utils/transcode');

const MEDIA_URL = 'https://giant.gfycat.com/ExaltedDecimalBrahmanbull.mp4';
transcode('ExaltedDecimalBrahmanbull.mp4').then(console.log);

process.on('unhandledRejection', console.error);
