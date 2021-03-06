require("dotenv").config();
const path = require("path");
const bodyParser = require("body-parser");
const Bandwidth = require("node-bandwidth");
const express = require("express");
const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const DatabaseConnector = require("./src/databaseConnector");

const db = new DatabaseConnector();
const port = process.env.PORT || 3000;

let client = new Bandwidth({
  userId: process.env.CATAPULT_USER_ID,
  apiToken: process.env.CATAPULT_API_TOKEN,
  apiSecret: process.env.CATAPULT_API_SECRET
});

app.use(bodyParser.json());

app.post("/callback", async (req, res) => {
  let callback = req.body[0];
  if (callback && callback.type === "message-received") {
    let message = callback.message;
    let threadId = db.getThreadIdForMessage(message);
    await createNewThreadIfNeeded(message);
    if (!sentimentEnabled) {
      delete message.analysis;
    }
    await db.insertMessage(message);
    console.log(`saved message ${message.id} to the db`);
    res.status(200).send();
    updateWebClients(threadId);
  } else {
    res.status(200).send();
  }
});

app.get("/api/threads", async (req, res) => {
  res.send(await db.getAllThreads());
});

app.get("/api/threads/:threadId", async (req, res) => {
  let threadId = req.params.threadId;
  res.send(await db.getMessagesForThread(threadId));
  await db.clearUnreadMessagesForThread(threadId);
  updateWebClients(threadId);
});

app.get("/api/threads/:threadId/:messageId", async (req, res) => {
  let messageId = req.params.messageId;
  res.send(await db.message(messageId));
});

app.post("/api/threads/:threadId", async (req, res) => {
  try {
    let participants = req.params.threadId.split(",");
    let recipients = [];
    participants.forEach(participant => {
      if (participant !== process.env.APPLICATION_NUMBER) {
        recipients.push(participant);
      }
    });
    let message = await client.v2.Message.send({
      from: process.env.APPLICATION_NUMBER,
      to: recipients,
      text: req.body.text,
      applicationId: process.env.APPLICATION_ID
    });
    let threadId = db.getThreadIdForMessage(message);
    await createNewThreadIfNeeded(message);
    await db.insertMessage(message);
    console.log(`saved message ${message.id} to the db`);
    res.send(message);
    updateWebClients(threadId);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.use("/", express.static("client/build"));
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build/index.html"));
});

async function createNewThreadIfNeeded(message) {
  let threadId = db.getThreadIdForMessage(message);
  let isNewThread = !(await db.threadExists(threadId));
  if (isNewThread) {
    await db.insertThread(threadId, message.text);
  }
}

async function updateWebClients(threadId) {
  io.emit("threads", await db.getAllThreads());
  io.emit("messages", {
    threadId: threadId,
    messages: await db.getMessagesForThread(threadId)
  });
}

server.listen(port);
console.log(`Server listening on port ${port}`);
