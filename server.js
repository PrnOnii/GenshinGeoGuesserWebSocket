'use strict';

const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });
let count = 0;

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('message', event => {
    const data = JSON.parse(event);
    console.log(data);
    switch(data.action) {
      case "increment":
        count++;
        ws.send(JSON.stringify({ status: "Success", data: count, tz: new Date()}));
        broadcast({ status: "Success", data: count, tz: new Date()}, ws)
        break;
      default:
        ws.send(JSON.stringify({ status: "Error", data: "Unknown message received", tz: new Date() }));
    }
  });
  ws.on('close', () => console.log('Client disconnected'));
});


// setInterval(() => {
//   wss.clients.forEach((client) => {
//     client.send(new Date().toTimeString());
//   });
// }, 1000);