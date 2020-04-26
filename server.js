// Dependencies
const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketIO(server);
const players = {};

const buildPasta = () => ({
    x: Math.floor(Math.random() * 800) + 400,
    y: Math.floor(Math.random() * 200) + 300
});
const buildValidation = () => ({
    red: false,
    blue: false,
})
const buildScore = () => ({
    red: 0,
    blue: 0,
})

let pasta = buildPasta();
let scores = buildScore();
let validations = buildValidation();

const listTeam = ['blue', 'red'];

app.set('port', 5000);
app.use(express.static(__dirname + '/public'));
// Routing
app.get('/', function (_request, response) {
    console.log(__dirname);
    response.sendFile(path.join(__dirname, '/index.html'));
});

const restartGame = () => {
    io.emit('deletePasta');
    validations = buildValidation();
    io.emit('validateUpdate', validations);
    io.emit('scoreUpdate', scores);
}

io.on('connection', function (socket) {
    if (Object.values(players).length >= 2) return;

    players[socket.id] = {
        id: socket.id,
    };
    socket.emit('currentPlayers', players);
    socket.emit('validateUpdate', validations);

    socket.on('disconnect', () => {
        const team = players[socket.id].team;
        if (team) {
            listTeam.push(team);
            validations[team] = false;
        }
        delete players[socket.id];
        scores = buildScore();
        io.emit('validateUpdate', validations);
        io.emit('disconnect');
    });
    socket.on('validate', () => {
        if (!players[socket.id].team) {
            players[socket.id].team = listTeam.pop();
        }
        socket.emit('currentPlayers', players);
        io.emit('newPlayer', players[socket.id]);
        validations[players[socket.id].team] = true;
        if (validations.blue && validations.red) {
            setTimeout(() => {
                if (validations.blue && validations.red) {
                    pasta = buildPasta();
                    io.emit('pastaLocation', pasta);
                }
            }, Math.random() * (6000 - 2000) + 2000);
        }
        io.emit('validateUpdate', validations);
    });

    socket.on('pastaCollected', () => {
        scores[players[socket.id].team] += 1;
        restartGame();
    });
    socket.on('pastaFailed', () => {
        scores[players[socket.id].team] -= 1;
        restartGame();
    });
});

// Starts the server.
server.listen(80, function () {
    console.log('Starting server on port 5000');
});