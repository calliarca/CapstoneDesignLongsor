const express = require('express');
const path = require('path');
const http = require('http');
const { SerialPort, ReadlineParser } = require('serialport');
const { Server } = require('socket.io'); // Import the `Server` class from `socket.io`

// servidor --------------------------------------------------
const app = express();
app.set('PORT', 9000);
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, '../client/')));

server.listen(app.get('PORT'), function () {
    console.log('server running on port', app.get('PORT'));
});

// serial communication --------------------------------------
const port = new SerialPort({
    path: 'COM3',
    baudRate: 19200
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// web sockets -----------------------------------------------
const io = new Server(server); // Initialize Socket.IO with the HTTP server

parser.on('data', function (data) {
    if (data.includes('ypr')) {
        console.log(data);
        io.emit('gyr-data', data); // Broadcast data to connected clients
    }
});
