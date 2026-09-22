const { server } = require('./server');

const port = Number(process.env.PORT) || 3000;

server.listen(port, () => {
	console.log(`OTT game server running at http://localhost:${port}`);
});
