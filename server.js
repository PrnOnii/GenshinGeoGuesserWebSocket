'use strict';

const express = require('express');
const { Server, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

var id = 0;
var lookup = [];
var gameMaster = null;
var players = [];
var answers = [];
var environment = {
  gameStarted: false,
  roundStarted: false,
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
  ws.id = ++id;
  lookup[ws.id] = ws;
  // Initial data send
  ws.send(JSON.stringify({ 
    action: "STATUS_INIT", 
    data: {
      environment: environment,
      gameMaster: gameMaster,
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
        break;
      case "ADD_PLAYER":
        if (data.isGM) {
          gameMaster = { name: data.name, id: ws.id };
          ws.send(JSON.stringify({ action: "HAS_GM", gameMaster: gameMaster }));
          broadcast({ action: "HAS_GM", gameMaster: gameMaster }, ws);
          break;
        }
        players.push({ name: data.name, score: 0, id: ws.id, answered: false });
        ws.send(JSON.stringify({ action: "UPDATE_PLAYERS", data: players }));
        broadcast({ action: "UPDATE_PLAYERS", data: players }, ws);
        break;
      case "REMOVE_PLAYER":
        var player = players.find(pl => pl.id == data.playerId);
        console.log(players.indexOf(player));
        if (answers.length > 0) { answers.splice(players.indexOf(player), 1)}
        players.splice(players.indexOf(player), 1);
        ws.send(JSON.stringify({ action: "UPDATE_PLAYERS", data: players }));
        broadcast({ action: "UPDATE_PLAYERS", data: players }, ws);
        break;
      case "START_GAME":
        players.forEach(pl => {
          answers.push({ playerId : pl.id, x: 0, y: 0, distance: 0, score: 0});
        })
        broadcast(JSON.stringify({ action: "ROUND_STARTED" }), ws);
        break;
      case "SUBMIT_ANSWER":
        let index = answers.findIndex(a => a.playerId == data.player.id);
        answers[index].x = data.answer.x;
        answers[index].y = data.answer.y;
        players.find(p => p.id == data.player.id).answered == true;
        ws.send(JSON.stringify({
          action: "UPDATE_PLAYERS",
          players: players
        }));
        broadcast(JSON.stringify({
          action: "UPDATE_PLAYERS",
          players: players
        }), ws);
        break;
      case "END_ROUND":
        answers.forEach(answer => {
          answer.distance = computeDistance(answer, data.goodAnswer);
          answer.score = computeScore(answer.distance);
          players[players.findIndex(p => p.id == answer.playerId)].score += answer.score;
        })
        ws.send(JSON.stringify({
          action: "SHOW_RESULTS",
          players: players,
          answers: answers
        }));
        broadcast(JSON.stringify({
          action: "SHOW_RESULTS",
          players: players,
          answers: answers
        }), ws)
        break;
      case "NEW_ROUND":
        answers = [];
        players.forEach(pl => {
          answers.push({ playerId : pl.id, x: 0, y: 0, distance: 0, score: 0});
        })
        broadcast(JSON.stringify({ action: "ROUND_STARTED" }), ws);
        break;
      case "END_GAME":
        gameMaster = null;
        players = [];
        answers = [];
        environment = {
          gameStarted: false,
        };
      case "RESET_VALUES":
        gameMaster = null;
        players = [];
        environment = {
          gameStarted: false,
        };
        break;
      default:
        ws.send(JSON.stringify({ status: "Error", data: "Unknown message received", tz: new Date() }));
    }
  });
  ws.on('close', () => {

    console.log('Client' + ws.id  + 'disconnected')
  });
});

function computeDistance(answer, goodAnswer) {
  let a = parseInt(this.goodAnswer.x) - parseInt(answerx);
  let b = parseInt(this.goodAnswer.y) - parseInt(answery);

  return Math.round(Math.sqrt(a*a + b*b));
}

function computeScore(distance) {
  return Math.round(5000 * Math.pow(0.998, distance));
}
// setInterval(() => {
//   wss.clients.forEach((client) => {
//     client.send(new Date().toTimeString());
//   });
// }, 1000);