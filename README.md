# 🐾 Calico vs Orange: The Ultimate Feline Rivalry 🐾

這是一個基於 **Node.js + Socket.IO** 開發的輕量級多人線上對戰遊戲平台。遊戲圍繞著「三花貓（老練冷靜）」與「橘貓（活力四射）」之間的宿命對決展開。

## 🚀 快速連結
- **🎮 立即遊玩**: [Calico vs Orange 遊戲頁面](https://calico-vs-orange-7x9q.onrender.com)
- **📊 伺服器監控**: [Render Dashboard](https://dashboard.render.com/web/) (僅限管理者)

---

## 🐱 核心主題
*   **玩家一**: 永遠扮演 **三花貓 (Calico Cat)**。
*   **玩家二**: 永遠扮演 **橘貓 (Orange Cat)**。
*   **視覺風格**: 充滿貓咪元素、肉墊印記、與充滿貓咪幽默感的系統訊息。

---

## 🎮 遊戲內容

### 1. 貓草賓果 (Catnip Bingo)
*   **介面**: 5x5 的隨機數字方格。
*   **玩法**: 回合制選號，每選中一個數字，雙方的盤面上都會標記肉墊（🐾）。
*   **新功能**: 
    *   **號碼紀錄**: 下方即時顯示每一輪由誰選中了哪個號碼。
*   **勝利條件**: 率先連成 **3 條線** 的貓咪獲勝。

### 2. 貓砂盆轟炸 (Litter Box Battleship)
*   **介面**: 6x6 的擴大戰區，支援「我的領土」與「對手雷達」雙畫面。
*   **部署**: 玩家可隱藏三件零食（尺寸 1x1, 1x2, 1x3），支援 **橫向 (H)** 或 **縱向 (V)** 排列。
*   **特色機制**:
    *   **一擊必殺 (One-Hit-Sink)**: 只要擊中對手長型船艦的「任意一個部位」，整艘船就會立即被擊沉。
    *   **同時回合**: 雙方必須同時決定轟炸位置，系統才會結算。
    *   **獎勵回合**: 在第 5, 10, 15, 20 回合，玩家可以獲得「雙重出擊」的獎勵（連續轟炸兩個點）。
    *   **防禦可視化**: 左側地圖會即時標記對手轟炸你的軌跡。
*   **勝利條件**: 率先擊沉對手 **全部 3 艘船艦**（取得 3 分）即可獲勝。

---

## 🛠 技術棧
*   **Backend**: Node.js, Express
*   **Real-time**: Socket.IO (WebSockets with Polling fallback)
*   **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (No Frameworks)
*   **Deployment**: Render (Auto-deploy via GitHub)

---

## 📦 專案結構
```text
little-game/
├── server.js              # 核心伺服器與房間配對邏輯
├── games/                 # 獨立遊戲邏輯模組
│   ├── bingo.js           # 賓果遊戲邏輯
│   └── battleship.js      # 海戰遊戲邏輯
├── public/                # 前端靜態資源
│   ├── index.html         # 中文化主介面
│   ├── style.css          # 貓咪主題樣式表
│   └── main.js            # 前端 Socket 處理與遊戲渲染
└── README.md              # 專案規格說明
```

---

## 🛠 本地開發設定
1. 安裝套件: `npm install`
2. 啟動開發伺服器: `npm run dev`
3. 瀏覽器打開 `http://localhost:3000`

---

## 🐈 系統開發者筆記
*   本專案採用「外科手術式修改」原則，保持代碼簡潔。
*   Socket 連線已優化，支援跨網域與 Render 環境的 `0.0.0.0` 監聽。
*   遊戲邏輯完全抽離至 `/games/` 目錄，易於擴充第三款遊戲。

---
*Powered by Catnip and Curiosity.*
