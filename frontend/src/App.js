import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import OperatorBot from './OperatorBot';
import { io } from "socket.io-client";

const socket = io("http://localhost:3001"); // ajuste a URL se necessário

function App() {
  const [nickname, setNickname] = useState("");
  const [nicknameSet, setNicknameSet] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showAudio, setShowAudio] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showBot, setShowBot] = useState(false);
  const [userList, setUserList] = useState([]);

  useEffect(() => {
    socket.on("chat message", (msg) => {
      setMessages((msgs) => [...msgs, msg]);
    });
    return () => socket.off("chat message");
  }, []);

  useEffect(() => {
    socket.on("user list", setUserList);
    return () => socket.off("user list");
  }, []);

  useEffect(() => {
  if (nicknameSet && nickname) {
    socket.emit('set nickname', nickname);
  }
}, [nicknameSet, nickname]);

  const handleSend = () => {
    if (input.trim() !== "") {
      const msg = { type: "text", content: input, user: nickname };
      socket.emit("chat message", msg);
      setInput("");
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let type = "image";
      if (file.type.startsWith("video")) type = "video";
      if (file.type.startsWith("audio")) type = "audio";
      const msg = { type, content: reader.result, user: nickname };
      socket.emit("chat message", msg);
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    setAudioURL(null);
    setRecording(true);
    audioChunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new window.MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      // Não exibe o áudio localmente, apenas envia para o chat
      const reader = new FileReader();
      reader.onload = () => {
        const msg = { type: "audio", content: reader.result, user: nickname };
        socket.emit("chat message", msg);
      };
      reader.readAsDataURL(blob);
    };
    mediaRecorder.start();
  };

  const stopRecording = () => {
    setRecording(false);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  if (!nicknameSet) {
    return (
      <div className="nickname-container">
        <div className="nickname-card">
          <h2>Bem-vindo ao Chat!</h2>
          <p>Escolha um apelido para começar:</p>
          <input
            className="nickname-input"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Seu apelido"
            maxLength={20}
          />
          <button
            className="nickname-btn"
            onClick={() => nickname && setNicknameSet(true)}
          >
            Entrar
          </button>
        </div>
        <footer style={{textAlign: 'center', marginTop: 20, color: '#888', fontSize: '0.9em'}}>
          Direitos © israelfadul@2025 Dev
        </footer>
      </div>
    );
  }

  return (
    <div className={`App${darkMode ? ' dark' : ''}`}>
      <div className="chat-container wide">
        {/* Botão Sair do chat */}
        <div style={{ position: 'absolute', top: 20, left: 20 }}>
          <button onClick={() => {
            setNickname("");
            setNicknameSet(false);
            socket.disconnect();
          }}>
            Sair do chat
          </button>
        </div>
        <div className="messages">
         {messages.map((msg, idx) => (
  <div key={idx} className={msg.type === 'info' ? 'info-message' : 'message'}>
    {msg.type === 'info' ? (
      <div className="info-message">{msg.content || msg.text}</div>
    ) : (
      <>
                  <span>{msg.user}: </span>
                  {msg.type === "text" && msg.content}
                  {msg.type === "image" && (
                    <img src={msg.content} alt="Imagem" style={{maxWidth: 200, maxHeight: 200}} />
                  )}
                  {msg.type === "video" && (
                    <video controls style={{maxWidth: 300}}>
                      <source src={msg.content} type="video/mp4" />
                      Seu navegador não suporta vídeo.
                    </video>
                  )}
                  {msg.type === "audio" && (
                    <audio controls src={msg.content} />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
          />
          <label className="upload-btn">
            📎
            <input
              type="file"
              accept="image/*,image/gif,video/*"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </label>
          <button onClick={() => setShowAudio(!showAudio)}>🎤</button>
          <button onClick={handleSend}>Enviar</button>
        </div>
        {showAudio && (
          <div className="audio-recorder">
            {!recording ? (
              <button onClick={startRecording}>Iniciar Gravação</button>
            ) : (
              <button onClick={stopRecording}>Parar Gravação</button>
            )}
            {/* Removido: exibição local do áudio gravado */}
          </div>
        )}
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>
        </div>
        <div className="chatbot-fab" onClick={() => setShowBot(!showBot)}>
          <span role="img" aria-label="bot">🤖</span>
        </div>
        {showBot && <OperatorBot />}
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Lista de usuários à esquerda */}
          <div style={{ minWidth: 150, borderRight: '1px solid #ccc', padding: 10 }}>
            <h4>Online</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {userList.map((user, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'limegreen',
                    marginRight: 6
                  }}></span>
                  {user}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;