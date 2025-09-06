const http = require('http');

const data = JSON.stringify({
  candidates: [
    { id: 'testid', name: 'Testkandidat', description: 'Testbeschreibung' }
  ]
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/candidates',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => { console.log('Response:', body); });
});

req.on('error', error => { console.error(error); });
req.write(data);
req.end();

