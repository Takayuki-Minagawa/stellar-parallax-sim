# 年周視差シミュレーター

地球の公転に伴う恒星の見かけの位置変化（年周視差）を、3D俯瞰・地球視点・グラフで体験できる教育用 Web アプリです。

> **対象**: 高校地学・宇宙分野の発展学習  
> **用途**: 授業補助・自習・天文距離単位「パーセク」の概念理解

---

## 機能概要

### 3 つの視点モード

| モード | 説明 |
|--------|------|
| **俯瞰視点** | Three.js による 3D シーン。太陽・地球の公転・近傍恒星・背景恒星群を上空から観察。カメラのドラッグ・ズーム操作に対応。 |
| **地球視点** | Canvas 2D による星空ビュー。地球から見たときの近傍恒星の位置変化を、背景恒星との比較で可視化。1月/7月の比較モードあり。 |
| **恒星視点** | Canvas 2D による発展ビュー。近傍恒星から太陽系を見た視点で、地球公転に伴う太陽・地球の見え方を表示。 |

### 操作パネル

- **公転アニメーション**: 再生/一時停止、速度 0.25× ～ 60×
- **時刻スライダー**: 任意の月（0°〜360°）に手動移動
- **恒星設定**:
  - プリセット恒星 7 種を追加（詳細は後述）
  - 距離スライダーで 1 pc ～ 200 pc を連続変更
  - カスタム恒星の追加・削除
  - 距離単位の切替（pc / 光年 / au）
- **表示設定**: 残像軌跡・視差補助線・1月/7月比較モードの ON/OFF

### グラフパネル

| グラフ | 内容 |
|--------|------|
| **見かけ位置の変化** | 1年間を通じた見かけ方向（RA・Dec）の軌跡プロット。各月の位置を点で表示。 |
| **視差角 vs 距離** | `p = 1/d` の反比例カーブと、選択中の恒星の現在値をリアルタイムで重ね表示。 |

### 学習パネル

- 現在の操作状態に応じた解説文（視点・距離によって内容が変化）
- パーセクの定義・視差公式の説明カード
- 理解度クイズ（3 問）: 視差角→距離の計算・近い星の判定・1 pc の定義

### その他

- **日本語 / English** 切替
- **ライト / ダーク** テーマ切替
- PC・タブレット・スマートフォン対応のレスポンシブレイアウト
- GitHub Pages への静的配信（サーバー不要）

---

## 恒星プリセット

プリセットデータの距離・視差角は実測値に基づきます。

| 恒星名 | 距離 | 視差角 |
|--------|------|--------|
| プロキシマ・ケンタウリ | 1.295 pc | 0.7689″ |
| アルファ・ケンタウリ | 1.34 pc | 0.7421″ |
| バーナード星 | 1.834 pc | 0.5454″ |
| シリウス | 2.637 pc | 0.3792″ |
| アルタイル | 5.13 pc | 0.195″ |
| ベガ | 7.68 pc | 0.1303″ |
| アルデバラン | 20.0 pc | 0.05″ |

---

## 天文計算モデル

このアプリは**教育目的の簡略モデル**を採用しています。実際の観測・測量への利用は想定していません。

### 座標系

- 太陽を原点とする右手系直交座標（XZ 平面 = 公転面、Y 軸 = 公転面法線方向）
- 地球の公転軌道を半径 1 au の真円として近似
- 公転角度 θ に対する地球位置: `(cos θ, 0, sin θ)` [au]

### 見かけ方向の計算

1. 恒星を赤道面内（Y=0）の固定点 `(cos φ · d, 0, sin φ · d)` に配置（φ: 方向角 [rad]、d: 距離 [au]）
2. 地球から恒星への方向ベクトルを正規化
3. 太陽からの基準方向ベクトルとの差を、恒星方向に垂直な RA・Dec 2 軸に投影
4. ラジアン → 秒角変換（× 180/π × 3600）

### 視差角と距離の関係

$$d \,[\mathrm{pc}] = \frac{1}{p \,[\mathrm{arcsec}]}$$

距離スライダーを変化させると視差角がリアルタイムに再計算され、グラフの現在点が連動します。

### 精度に関する注記

- 地球公転軌道を真円で近似しているため、実際の楕円軌道（離心率 ≈ 0.017）との差異があります
- 恒星の固有運動・年周光行差は考慮していません
- 視差は赤道面に対して水平（Dec 方向ずれ = 0）に計算されます。実際の恒星は黄道面に対して様々な傾きを持ちます

---

## 技術スタック

| 分類 | 採用技術 |
|------|----------|
| フレームワーク | React 18 + TypeScript |
| ビルドツール | Vite 5 |
| 3D レンダリング | Three.js 0.168 + React Three Fiber 8 + Drei 9 |
| 2D 描画 | Canvas API（地球視点・恒星視点・グラフ） |
| 状態管理 | Zustand 5 |
| スタイリング | Tailwind CSS 3 |
| i18n | 自前ロード機構（`public/locales/{lang}.json`） |
| CI/CD | GitHub Actions → GitHub Pages |

---

## ディレクトリ構成

```
stellar-parallax-sim/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages 自動デプロイ
├── public/
│   └── locales/
│       ├── ja.json             # 日本語 UI テキスト
│       └── en.json             # English UI text
├── src/
│   ├── main.tsx                # エントリポイント
│   ├── App.tsx                 # ルートコンポーネント・レイアウト定義
│   ├── index.css               # グローバルスタイル (Tailwind ベース)
│   ├── vite-env.d.ts           # Vite 環境変数型定義
│   ├── types/
│   │   └── index.ts            # 共通型定義 (Star, ViewMode, etc.)
│   ├── data/
│   │   └── starPresets.ts      # 実恒星プリセットデータ
│   ├── store/
│   │   └── simulationStore.ts  # Zustand グローバル状態
│   ├── utils/
│   │   ├── astronomy.ts        # 天文計算ユーティリティ
│   │   └── i18n.ts             # i18n ロード・テキスト取得関数
│   ├── hooks/
│   │   ├── useTheme.ts         # ダーク/ライトテーマ管理
│   │   └── useI18n.ts          # 翻訳フック
│   └── components/
│       ├── layout/
│       │   └── Header.tsx      # ヘッダー (タイトル・テーマ切替・言語切替)
│       ├── controls/
│       │   └── ControlPanel.tsx # 操作パネル (再生・恒星・表示設定タブ)
│       ├── views/
│       │   ├── OverheadView.tsx  # 俯瞰ビュー (Three.js / React Three Fiber)
│       │   ├── ObserverView.tsx  # 地球視点ビュー (Canvas 2D)
│       │   └── StellarView.tsx   # 恒星視点ビュー (Canvas 2D)
│       ├── graphs/
│       │   └── GraphPanel.tsx    # グラフパネル (位置プロット・視差カーブ)
│       └── learning/
│           └── LearningPanel.tsx # 学習パネル・クイズ
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

---

## ローカル環境での実行

Node.js 18 以上が必要です。

```bash
# リポジトリのクローン
git clone https://github.com/<your-username>/stellar-parallax-sim.git
cd stellar-parallax-sim

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:5173/stellar-parallax-sim/` を開いてください。

```bash
# 本番ビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

---

## GitHub Pages へのデプロイ

`main` ブランチへの push 時に GitHub Actions が自動的にビルド・デプロイします。

リポジトリを GitHub に作成した後、**Settings → Pages → Source** を `GitHub Actions` に設定してください。

デプロイ後の URL は `https://<your-username>.github.io/stellar-parallax-sim/` になります。

---

## ライセンス

MIT License

---

## 参考・謝辞

- プリセット恒星の距離データ: [SIMBAD Astronomical Database](http://simbad.u-strasbg.fr/)、[Hipparcos Catalogue](https://www.cosmos.esa.int/web/hipparcos)
- 3D レンダリング: [Three.js](https://threejs.org/) / [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- 教育コンテンツ設計: 高校地学（地学基礎）学習指導要領「宇宙の構造」分野を参考
