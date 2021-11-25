'use strict';

const express = require('express');
const { Server, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

let count = 0;
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
  ws.send(JSON.stringify({ action: "STATUS_INIT", data: environment }));
  ws.on('message', event => {
    const data = JSON.parse(event);
    console.log(data);
    switch(data.action) {
      case "KEEP_ALIVE":
        ws.send(JSON.stringify({ action: "KEEP_ALIVE", status: "ok keeping alive" }));
        // broadcast({ status: "Success", data: count, tz: new Date()}, ws)
        break;
      case "ADD_PLAYER":
        let player = players.find(pl => pl.name == data.name);
        console.log(player);
        if (player) {
          ws.send(JSON.stringify({ action: "UPDATE_PLAYER_ID", data: players}))
          break;
        }
        if (data.isGM) {
          players.push({ name: data.name, id: 0, score: 0, isGM: true});
          environment.hasGM = true;
          broadcast({ action: "HAS_GM", data: null }, ws);
        } else {
          const playerCount = players.length + 1
          players.push({ name: data.name, id: playerCount, score: 0, isGM: false});
        }
        ws.send(JSON.stringify({ action: "UPDATE_PLAYERS", data: players }));
        broadcast({ action: "UPDATE_PLAYERS", data: players }, ws);
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