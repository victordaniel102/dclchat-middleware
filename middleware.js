
var net = require('net');
var cors = require('cors');
var express = require('express');
var socket = require('socket.io');
var app = express();

var users = {};
var server = app.listen(process.env.PORT || 13000, function(){
	console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});
app.use(express.static('public'));
app.use(cors);

var io = socket(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('New connection', socket.id);

	socket.on('join', (name) => {
        console.log('-={', name);
		users[socket.id] = name;
		socket.broadcast.emit('user join', users[socket.id]);
		io.emit('users update', users);

		socket.on('disconnect', () => {
            console.log('-={ disconnect');
			socket.broadcast.emit('user disconnect', users[socket.id]);
			delete users[socket.id];
			io.emit('users update', users);
		})

		socket.on("msg", (msg) => {
            console.log('-={ msg ', msg);
			socket.broadcast.emit('user msg', users[socket.id], msg);
			socket.broadcast.emit('stopping typing');
		});  

		socket.on('typing', () => {
			socket.broadcast.emit('user typing', users[socket.id]);
		});
		
		socket.on('stopping typing', () => {
			socket.broadcast.emit('user stopped typing');
		});
	});

    socket.on('disconnect', () => {
        console.log('-={', socket.id + ' disconnected');
    })
});