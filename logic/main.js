const { server } = require('./server');

const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';

server.listen(port, host, () => {
  console.log(`OTTv2 server listening on http://${host}:${port}`);
});
