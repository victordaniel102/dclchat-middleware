
var net = require('net');
var cors = require('cors');
var express = require('express');
var socket = require('socket.io');
var clientTcp = new net.Socket();
var app = express();

var backendIp = '192.168.0.11';
var backendPort = 13000;

var messages = [];

function formatData(data){
	let result = Buffer.from(data).toString().split('endMessageDCL');
	result.pop();
	return result;
}

var server = app.listen(process.env.PORT || 13001, function(){
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

clientTcp.connect(backendPort, backendIp, function() {
	console.log('== Conectado com servidor TCP ==');
});

io.on('connection', async (socket) => {
	
	console.log('teste')
	const ids = await io.allSockets();
	console.log(ids,'ids')

	
	clientTcp.on('data', function(data) {
		data = formatData(data);
		data.forEach(message => {
			let messageJson = JSON.parse(message);
			if(messageJson.broadcast){
				messageJson = messageJson.broadcast;
				let { eventName } = messageJson;
				callEvent(eventName, messageJson, true);
			}else{
				let { eventName } = messageJson;
				callEvent(eventName, messageJson);
			}
		});
	});

	function callEvent(eventName, data, broadcast = false){
		switch(eventName){
			case 'userJoin':
				if(broadcast){
					socket.broadcast.emit('user join', data.name);
				}
				break;
			case 'usersUpdate':
				io.emit('users update', data.users);
				break;
			case 'userDisconnectedJson':
				if(broadcast){
					socket.broadcast.emit('user disconnect', data.name);
				}
				break;
			case 'userMessage':
				if(broadcast){
					if (!messages.length) {
						messages.push({ name: data.name, senderId: data.socketId, text: data.text });
					} else {
						if (messages[messages.length - 1].text != data.text) {
							messages.push({ name: data.name, senderId: data.socketId, text: data.text });
						}
					}
					io.emit('update messages', messages);
				}
				break;
			case 'userStopTyping':
				if(broadcast){
					socket.broadcast.emit('stopping typing');
				}
				break;
			case 'userTyping':
				if(broadcast){
					socket.broadcast.emit('user typing', data.name);
				}
				break;
			case 'stopTyping':
				if(broadcast){
					socket.broadcast.emit('user stopped typing');
				}
				break;
			default:
				console.log("Evento não encontrado: ", message.eventName);
				break;
		}
	}

	clientTcp.on('close', function() {
		console.log('Connection closed');
	});

    console.log('New connection', socket.id);

	socket.on('join', (name) => {
        console.log('-={', name);
		clientTcp.write(JSON.stringify({
			eventName: "connect",
			socketId: socket.id,
			name: name.name
		}));

		socket.on('disconnect', () => {
            console.log('-={ disconnect');
			clientTcp.write(JSON.stringify({
				eventName: "disconnect",
				socketId: socket.id
			}));
		})

		socket.on("msg", (msg) => {
            console.log('-={ msg ', msg);
			clientTcp.write(JSON.stringify({
				eventName: "msg",
				socketId: socket.id,
				text: msg.body
			}));
		});  

		socket.on('typing', () => {
			clientTcp.write(JSON.stringify({
				eventName: "typing",
				socketId: socket.id
			}));
		});
		
		socket.on('stopping typing', () => {
			clientTcp.write(JSON.stringify({
				eventName: "stopTyping",
				socketId: socket.id
			}));
		});
	});

    socket.on('disconnect', () => {
        console.log('-={', socket.id + ' disconnected');
    })
});