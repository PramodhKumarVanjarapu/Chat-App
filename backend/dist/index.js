"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const random_string_generator_1 = __importDefault(require("random-string-generator"));
const users = new Map();
const wss = new ws_1.WebSocket.Server({ port: 8080 });
function createRoomId() {
    let id = (0, random_string_generator_1.default)(6, "uppernumeric");
    if (users.has(id)) {
        id = createRoomId();
    }
    return id;
}
function createRoom(socket) {
    const roomId = createRoomId();
    users.set(roomId, []);
    const res = { roomId };
    socket.send(JSON.stringify(res));
}
function joinRoom(req, socket) {
    const { roomId, username } = req.payload;
    let res = null;
    if (users.has(roomId)) {
        //@ts-ignore
        const totalUsers = users.get(roomId);
        const isPresent = totalUsers.find(({ socket: soc }) => {
            if (socket == soc)
                return true;
        });
        if (!isPresent) {
            users.set(roomId, [...totalUsers, { username, socket }]);
            res = { message: `${username} has joined the Chat` };
        }
    }
    if (res != null) {
        const getRoom = users.get(roomId);
        if (getRoom) {
            getRoom.forEach(({ socket: soc }) => {
                if (soc != socket) {
                    soc.send(JSON.stringify(res));
                }
            });
        }
    }
}
function sendChat(req, soc) {
    var _a, _b;
    const { roomId, username } = req.payload;
    if ((_a = users.get(roomId)) === null || _a === void 0 ? void 0 : _a.find(({ socket }) => soc == socket)) {
        const msg = req.payload.message;
        (_b = users.get(roomId)) === null || _b === void 0 ? void 0 : _b.forEach(({ socket }) => {
            if (soc != socket) {
                const res = { username, message: msg };
                socket.send(JSON.stringify(res));
            }
        });
    }
}
wss.on("connection", function (socket) {
    socket.on("message", (msg) => {
        try {
            let req = JSON.parse(msg.toString());
            if (req.type) {
                if (req.type == "create") {
                    createRoom(socket);
                }
                else if (req.type == "join") {
                    joinRoom(req, socket);
                }
                else if ((req.type = "chat")) {
                    sendChat(req, socket);
                }
            }
        }
        catch (e) {
            console.log(e);
        }
    });
});
