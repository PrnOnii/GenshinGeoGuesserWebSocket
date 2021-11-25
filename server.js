'use strict';

const express = require('express');
const { Server, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

const players = [];
const environment = {
  hasGM: false,
};

const broadcast = (data, ws) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client !== ws) {
      client.send(JSON.stringify(data));
    }
  });
};

wss.on('connection', (ws) => {
  console.log('Client connected');
  // Initial data send
  ws.send(JSON.stringify({ 
    action: "STATUS_INIT", 
    data: {
      environment: environment,
      players: players
    }
  }));

  //Global message handler
  ws.on('message', event => {
    const data = JSON.parse(event);
    console.log(data);
    switch(data.action) {
      case "KEEP_ALIVE":
        ws.send(JSON.stringify({ action: "KEEP_ALIVE", status: "ok keeping alive" }));
        // broadcast({ status: "Success", data: count, tz: new Date()}, ws)
        break;
      case "ADD_PLAYER":
        players.push({ name: data.name, score: 0, isGM: data.isGM});
        if (data.isGM) {
          environment.hasGM = true;
          broadcast({ action: "HAS_GM", data: null }, ws);
        }
        ws.send(JSON.stringify({ action: "UPDATE_PLAYERS", data: players }));
        broadcast({ action: "UPDATE_PLAYERS", data: players }, ws);
        break;
      case "RESET_VALUES":
        players = [];
        environment = {
          hasGM: false,
        };
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