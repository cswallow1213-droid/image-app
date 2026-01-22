import { useRef, useState, useEffect } from "react";

export default function App() {
  const canvasRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [img, setImg] = useState(null);
  const [frame, setFrame] = useState(null);

  // 圖片位置與縮放
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 600, y: 600 });

  // 拖曳狀態
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // 載入模板
  useEffect(() => {
    const f = new Image();
    f.src = "/templates/frame.png";
    f.onload = () => setFrame(f);
  }, []);

  // 載入使用者圖片
  useEffect(() => {
    if (!photo) return;
    const i = new Image();
    i.src = URL.createObjectURL(photo);
    i.onload = () => setImg(i);
  }, [photo]);

  // 畫布合成（frame 永遠顯示）
  useEffect(() => {
    if (!frame) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = 1200;
    canvas.height = 1200;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 使用者圖片（有才畫）
    if (img) {
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, pos.x - w / 2, pos.y - h / 2, w, h);
    }

    // 模板永遠在上層
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
  }, [img, frame, scale, pos]);

  // 拖曳事件
  const onPointerDown = (e) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  // 下載圖片
  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = "result.png";
    link.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h2>圖片合成工具</h2>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setPhoto(e.target.files[0])}
      />

      <br /><br />

      <label>
        縮放：
        <input
          type="range"
          min="0.2"
          max="3"
          step="0.01"
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
        />
      </label>

      <br /><br />

      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        style={{
          width: 300,
          height: 300,
          border: "1px solid #ccc",
          cursor: "grab",
          touchAction: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      <br /><br />

      <button onClick={downloadImage}>下載圖片</button>

      <p style={{ color: "#666", fontSize: 12 }}>
        👉 拖曳圖片位置，拉滑桿縮放大小。模板一開始就會顯示。
      </p>
    </div>
  );
}
