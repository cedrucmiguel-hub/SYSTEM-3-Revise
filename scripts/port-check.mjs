import net from "node:net";

function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.once("connect", () => {
      socket.destroy();
      resolve({ port, open: true });
    });
    socket.once("error", () => {
      socket.destroy();
      resolve({ port, open: false });
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve({ port, open: false });
    });
    socket.connect(port, host);
  });
}

const ports = [3000, 4000];
const results = [];
for (const port of ports) {
  results.push(await checkPort(port));
}

console.log(JSON.stringify(results, null, 2));
