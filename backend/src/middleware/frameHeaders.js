'use strict';

/**
 * frameHeaders 미들웨어
 *
 * /embed/:token 경로에서 iframe 임베드를 허용하기 위해
 * X-Frame-Options 헤더를 제거하고 CSP의 frame-ancestors를 *로 설정한다.
 *
 * 그 외 경로에서는 기본 보안 헤더(SAMEORIGIN)를 유지한다.
 *
 * 사용법: app.use(frameHeaders) — 전역으로 등록하면 경로를 자동 판단한다.
 */
function frameHeaders(req, res, next) {
  const isEmbedRoute = req.path.startsWith('/embed/');

  if (isEmbedRoute) {
    // iframe 허용: X-Frame-Options 제거, CSP frame-ancestors 개방
    res.removeHeader('X-Frame-Options');
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors *; default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;"
    );
  } else {
    // 기본 보안 헤더
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self'"
    );
  }

  next();
}

module.exports = frameHeaders;
