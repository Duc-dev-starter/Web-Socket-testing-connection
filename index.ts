import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import configure from './routers';

const app = express();
const port = process.env.PORT || 3000;

function onSocketPreError(e: Error) {
    console.log(e);
}

function onSocketPostError(e: Error) {
    console.log(e);
}

configure(app);

console.log(`Attempting to run server on port ${port}`);

const s = app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
// Lý do để sử dụng { noServer: true } khi tạo WebSocketServer là để chỉ định rằng
//  WebSocketServer sẽ không tự mình tạo một máy chủ HTTP. 
//  Thay vào đó, nó sẽ được gắn vào một máy chủ HTTP đã tồn tại,
//  trong trường hợp này là máy chủ được tạo bởi express.
const wss = new WebSocketServer({ noServer: true });

s.on('upgrade', (req, socket, head) => {
    //bước trước khi thực hiện upgrade và kết nối tới websocket server
    socket.on('error', onSocketPreError);

    // perform auth
    if (!!req.headers['BadAuth']) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
        socket.removeListener('error', onSocketPreError);
        wss.emit('connection', ws, req);
    });
});

wss.on('connection', (ws, req) => {
    ws.on('error', onSocketPostError);

    ws.on('message', (msg, isBinary) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg, { binary: isBinary });
            }
        });
    });

    ws.on('close', () => {
        console.log('Connection closed');
    });
});