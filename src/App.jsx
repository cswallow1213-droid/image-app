import { useRef, useState, useEffect } from "react";

const CANVAS_SIZE = 1200;

// 你可以只放 frame，不放 mask；有 mask 才會套用「限制透明區」效果
const TEMPLATES = [
  { id: 1, name: "模板 A", frameSrc: "/templates/frame-1.png", maskSrc: "/templates/mask-1.png" },
  { id: 2, name: "模板 B", frameSrc: "/templates/frame-2.png", maskSrc: "/templates/mask-2.png" },
  { id: 3, name: "模板 C", frameSrc: "/templates/frame-3.png", maskSrc: "/templates/mask-3.png" },
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function App() {
  const canvasRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [userImg, setUserImg] = useState(null);

  const [currentTemplate, setCurrentTemplate] = useState(TEMPLATES[0]);
  const [frameImg, setFrameImg] = useState(null);
  const [maskImg, setMaskImg] = useState(null);

  // 是否啟用「限制透明區」（有 mask 才有效）
  const [useMask, setUseMask] = useState(true);

  // 拖曳 + 縮放 + 旋轉
  const [scale, setScale] = useState(1);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [pos, setPos] = useState({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 });

  // 拖曳狀態
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // 載入模板 frame + mask（切換模板時）
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const f = await loadImage(currentTemplate.frameSrc);
        if (!cancelled) setFrameImg(f);
      } catch (e) {
        console.error("Failed to load frame:", e);
        if (!cancelled) setFrameImg(null);
      }

      // mask 是可選：載不到就當作沒有
      try {
        const m = await loadImage(currentTemplate.maskSrc);
        if (!cancelled) setMaskImg(m);
      } catch {
        if (!cancelled) setMaskImg(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTemplate]);

  // 載入使用者照片
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    loadImage(url)
      .then((img) => setUserImg(img))
      .catch((e) => console.error("Failed to load user image:", e))
      .finally(() => URL.revokeObjectURL(url));
  }, [photo]);

  // 繪製合成（主畫布）
  useEffect(() => {
    if (!frameImg) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 1) 先把照片畫到「離屏 canvas」
    const off = document.createElement("canvas");
    off.width = CANVAS_SIZE;
    off.height = CANVAS_SIZE;
    const offCtx = off.getContext("2d");

    if (userImg) {
      const rad = (rotationDeg * Math.PI) / 180;

      // 以 pos 為中心旋轉與縮放
      offCtx.save();
      offCtx.translate(pos.x, pos.y);
      offCtx.rotate(rad);

      const w = userImg.width * scale;
      const h = userImg.height * scale;
      offCtx.drawImage(userImg, -w / 2, -h / 2, w, h);

      offCtx.restore();
    }

    // 2) 如果啟用 mask 且有 maskImg：把照片裁在白色區域
    if (useMask && maskImg) {
      offCtx.globalCompositeOperation = "destination-in";
      offCtx.drawImage(maskImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      offCtx.globalCompositeOperation = "source-over";
    }

    // 3) 把（可能已裁切的）照片畫到主畫布
    ctx.drawImage(off, 0, 0);

    // 4) 最後疊上模板（永遠在最上層）
    ctx.drawImage(frameImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }, [userImg, frameImg, maskImg, useMask, scale, rotationDeg, pos]);

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

  // 下載
  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = "result.png";
    link.click();
  };

  // 重置位置/縮放/旋轉
  const resetTransform = () => {
    setScale(1);
    setRotationDeg(0);
    setPos({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 });
  };

  // 旋轉 90 度（方便按一下就對齊）
  const rotate90 = (dir = 1) => {
    setRotationDeg((d) => {
      const next = d + 90 * dir;
      // 把角度保持在 -180~180 之間，滑桿手感較好
      const normalized = ((next + 180) % 360) - 180;
      return normalized;
    });
  };

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h2 style={{ marginBottom: 8 }}>圖片合成工具</h2>

      {/* 模板縮圖選擇 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>選擇模板</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setCurrentTemplate(t)}
              style={{
                width: 92,
                padding: 6,
                borderRadius: 10,
                border: currentTemplate.id === t.id ? "2px solid #000" : "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
                textAlign: "center",
              }}
              title={t.name}
            >
              <img
                src={t.frameSrc}
                alt={t.name}
                style={{
                  width: "100%",
                  height: 70,
                  objectFit: "cover",
                  borderRadius: 8,
                  display: "block",
                }}
              />
              <div style={{ fontSize: 12, marginTop: 6 }}>{t.name}</div>
            </button>
          ))}
        </div>

        {/* mask 開關：有 mask 才有效 */}
        <div style={{ marginTop: 10, fontSize: 12, color: "#444" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={useMask}
              onChange={(e) => setUseMask(e.target.checked)}
              disabled={!maskImg}
            />
            限制照片只出現在透明區（需要 mask；{maskImg ? "已偵測到" : "未偵測到"}）
          </label>
        </div>
      </div>

      {/* 上傳 + 控制 */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>上傳照片</div>
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              縮放：{scale.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.01"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              style={{ width: 260 }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              旋轉：{rotationDeg}°
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotationDeg}
              onChange={(e) => setRotationDeg(Number(e.target.value))}
              style={{ width: 260 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => rotate90(-1)}>⟲ 旋轉 -90°</button>
              <button onClick={() => rotate90(1)}>⟳ 旋轉 +90°</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button onClick={resetTransform}>重置</button>
            <button onClick={downloadImage}>下載 PNG</button>
          </div>

          <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>
            👉 在右邊畫面拖曳照片位置；用滑桿縮放/旋轉；模板永遠在最上層
          </div>
        </div>

        {/* 畫布預覽 */}
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          style={{
            width: 320,
            height: 320,
            border: "1px solid #ddd",
            borderRadius: 12,
            cursor: "grab",
            touchAction: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </div>
  );
}
