import { useEffect, useRef } from 'react';

/**
 * 지정한 간격마다 callback을 호출하는 폴링 훅.
 * callback이 변경돼도 최신 참조를 사용한다 (stale closure 방지).
 *
 * @param {() => void | Promise<void>} callback - 폴링마다 실행할 함수
 * @param {number} interval - 폴링 간격 (ms), 기본 30_000
 * @param {boolean} enabled  - false로 설정하면 폴링 중지
 */
export function usePolling(callback, interval = 30_000, enabled = true) {
  const savedCb = useRef(callback);

  // 최신 callback을 ref에 보관
  useEffect(() => {
    savedCb.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      try {
        savedCb.current();
      } catch {
        // 개별 폴링 오류가 타이머를 중단시키지 않도록 흡수
      }
    };

    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
}
