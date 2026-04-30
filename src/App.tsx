import { useState, useEffect, useMemo } from "react";
import "./App.css";

type Word = {
  term: string;
  meaning: string;
  attempts: number;
  corrects: number;
};

export default function WordbookApp() {
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isFinished, setIsFinished] = useState(false); // 全問終了フラグ

  useEffect(() => {
    const saved = localStorage.getItem("my-wordbook");
    if (saved) setWords(JSON.parse(saved));
  }, []);

  // フィッシャー–イェーツのシャッフルアルゴリズム
  const shuffleArray = (array: any[]) => {
    const clone = [...array];
    for (let i = clone.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [clone[i], clone[j]] = [clone[j], clone[i]];
    }
    return clone;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/);
      const newWords: Word[] = lines
        .map((line) => {
          const [term, meaning] = line.split(",").map((s) => s.trim());
          return { term, meaning, attempts: 0, corrects: 0 };
        })
        .filter((w) => w.term && w.meaning);

      // ランダムに並び替えてセット
      const shuffled = shuffleArray(newWords);
      setWords(shuffled);
      setCurrentIndex(0);
      setIsFinished(false);
      localStorage.setItem("my-wordbook", JSON.stringify(shuffled));
    };
    reader.readAsText(file);
  };

  const handleCheck = () => {
    if (isFinished || !words[currentIndex] || !inputValue.trim()) return;

    const isCorrect = inputValue.trim() === words[currentIndex].meaning;

    const updatedWords = [...words];
    updatedWords[currentIndex] = {
      ...words[currentIndex],
      attempts: words[currentIndex].attempts + 1,
      corrects: words[currentIndex].corrects + (isCorrect ? 1 : 0),
    };

    setWords(updatedWords);
    setFeedback(
      isCorrect
        ? "⭕ 正解！"
        : `❌ 不正解 (正解: ${words[currentIndex].meaning})`,
    );
    setInputValue("");

    setTimeout(() => {
      setFeedback("");
      // 最後の問題かどうかを判定
      if (currentIndex === words.length - 1) {
        setIsFinished(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 1000);
  };

  const stats = useMemo(() => {
    const totalAttempts = words.reduce((acc, w) => acc + w.attempts, 0);
    const totalCorrects = words.reduce((acc, w) => acc + w.corrects, 0);
    const rate =
      totalAttempts > 0
        ? ((totalCorrects / totalAttempts) * 100).toFixed(1)
        : "0";
    return { totalAttempts, totalCorrects, rate };
  }, [words]);

  // 苦手単語を「ミスが多い順」にソートしてエクスポート
  const exportWeakWords = () => {
    const weakWords = words
      .filter((w) => w.attempts > w.corrects)
      .map((w) => ({
        ...w,
        missCount: w.attempts - w.corrects, // ミス回数を算出
      }))
      // ミス回数が多い順（降順）に並び替え
      .sort((a, b) => b.missCount - a.missCount);

    if (weakWords.length === 0) return alert("全問正解です！素晴らしい！");

    // CSVの中身（単語, 意味, ミス回数）
    const csvContent =
      "単語,意味,ミス回数\n" +
      weakWords.map((w) => `${w.term},${w.meaning},${w.missCount}`).join("\n");

    // 文字化け防止のためにBOM（Byte Order Mark）を付与
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "苦手リスト_ミス順.csv");
    link.click();
  };

  return (
    <div className="container">
      <h1 className="title">実用単語帳</h1>

      <div className="file-upload-area">
        <input type="file" accept=".csv" onChange={handleFileUpload} />
      </div>

      {words.length > 0 && (
        <div className="card">
          {isFinished ? (
            <div className="finish-screen">
              <div className="celebration-icon">🎉</div>
              <h2>学習完了！</h2>
              <p className="score-display">
                正答率: <span className="score-number">{stats.rate}%</span>
              </p>

              <button onClick={exportWeakWords} className="btn btn-success">
                間違えた順にCSVで保存
              </button>

              <button
                onClick={() => {
                  setWords(shuffleArray(words));
                  setCurrentIndex(0);
                  setIsFinished(false);
                }}
                className="btn btn-link"
              >
                もう一度最初から（シャッフル）
              </button>
            </div>
          ) : (
            <>
              <div className="status-bar">
                <span>
                  {currentIndex + 1} / {words.length}
                </span>
                <span
                  className={
                    words[currentIndex].attempts -
                      words[currentIndex].corrects >
                    0
                      ? "miss-count-alert"
                      : ""
                  }
                >
                  過去のミス:{" "}
                  {words[currentIndex].attempts - words[currentIndex].corrects}
                  回
                </span>
              </div>

              <div className="word-display">{words[currentIndex].term}</div>

              <input
                type="text"
                className="answer-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                placeholder="答えを入力..."
                autoFocus
              />

              <div
                className={`feedback-text ${feedback.includes("⭕") ? "correct" : "wrong"}`}
              >
                {feedback}
              </div>

              <button
                onClick={handleCheck}
                className="btn btn-primary"
                disabled={!inputValue.trim()}
              >
                判定して次へ
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
