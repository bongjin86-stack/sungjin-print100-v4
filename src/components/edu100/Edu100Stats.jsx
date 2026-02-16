import { useCallback, useEffect, useRef, useState } from "react";

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function useCountUp(target, duration = 2000) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  const start = useCallback(() => {
    if (startedRef.current || target === 0) return;
    startedRef.current = true;

    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  useEffect(() => {
    startedRef.current = false;
    setValue(0);
  }, [target]);

  return { value, start };
}

// 라이브 시계 (오늘 날짜 + 실시간 시각)
function LiveClock() {
  const [now, setNow] = useState("");

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      const s = String(d.getSeconds()).padStart(2, "0");
      setNow(`${y}.${m}.${day} ${h}:${min}:${s}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="edu100-stats-date-range">
      <span className="edu100-stats-live-dot" />
      <span className="edu100-stats-live-label">LIVE</span>
      {now}
    </span>
  );
}

export default function Edu100Stats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const bookCount = useCountUp(stats?.total_book_count || 0);

  useEffect(() => {
    fetch("/api/edu100/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStats(data);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (visible && stats) {
      bookCount.start();
    }
  }, [visible, stats]);

  if (error) return null;

  return (
    <div className="edu100-stats" ref={containerRef}>
      <div className="edu100-stats-counter">
        <LiveClock />
        <span className="edu100-stats-number">
          {stats ? bookCount.value.toLocaleString("ko-KR") : "-"}
          <span className="edu100-stats-plus"> 부+</span>
        </span>
        <span className="edu100-stats-label">올해 제작된 교재</span>
      </div>
    </div>
  );
}
