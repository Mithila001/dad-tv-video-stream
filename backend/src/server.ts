import express from "express";
import cors from "cors";
import path from "path";
import {
  liveQueueSequence,
  resolveLogin,
  videoLibrary,
  type LoginRequestBody,
} from "./mockData";

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use("/assets", express.static(path.resolve(__dirname, "../assets")));

app.get("/api/videos", (_request, response) => {
  response.json(videoLibrary);
});

app.get("/api/queue", (_request, response) => {
  response.json(liveQueueSequence);
});

app.post("/api/login", (request, response) => {
  const { username = "", password = "" } = request.body as LoginRequestBody;
  const currentUser = resolveLogin(username, password);

  if (!currentUser) {
    response.status(401).json({ message: "Invalid credentials" });
    return;
  }

  response.json({ currentUser });
});

app.listen(port, () => {
  console.log(`LobbyStream API listening on http://localhost:${port}`);
});
