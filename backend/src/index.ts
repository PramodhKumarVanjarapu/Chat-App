import { WebSocket } from "ws";
import random from "random-string-generator";

interface iUser {
  username: string;
  socket: WebSocket;
}

const users = new Map<string, iUser[]>();

const wss = new WebSocket.Server({ port: 8080 });

function createRoomId() {
  let id = random(6, "uppernumeric");
  if (users.has(id)) {
    id = createRoomId();
  }
  return id;
}

function createRoom(socket: WebSocket) {
  const roomId = createRoomId();
  users.set(roomId, []);
  const res = { roomId };
  socket.send(JSON.stringify(res));
}

function joinRoom(req: any, socket: WebSocket) {
  const { roomId, username } = req.payload;
  let res = null;
  if (users.has(roomId)) {
    //@ts-ignore
    const totalUsers: iUser[] = users.get(roomId);
    const isPresent = totalUsers.find(({ socket: soc }) => {
      if (socket == soc) return true;
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

function sendChat(req: any, soc: WebSocket) {
  const { roomId, username } = req.payload;
  if (users.get(roomId)?.find(({ socket }) => soc == socket)) {
    const msg = req.payload.message;
    users.get(roomId)?.forEach(({ socket }) => {
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
        } else if (req.type == "join") {
          joinRoom(req, socket);
        } else if ((req.type = "chat")) {
          sendChat(req, socket);
        }
      }
    } catch (e) {
      console.log(e);
    }
  });
});
