import Lobby from "./components/Lobby.jsx";
import SharedGame from "./playhtml/SharedGame.jsx";

export default function App() {
  const roomId = new URLSearchParams(window.location.search).get("room");
  return roomId ? <SharedGame /> : <Lobby />;
}
