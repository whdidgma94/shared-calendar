package com.app.sharedcalendar;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CalendarWidgetConfigure extends Activity {

    int mWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
    EditText mInput;
    TextView mError;
    Button mAddBtn;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setResult(RESULT_CANCELED); // 기본값: 취소

        setContentView(R.layout.widget_configure);

        mInput  = findViewById(R.id.widget_configure_input);
        mError  = findViewById(R.id.widget_configure_error);
        mAddBtn = findViewById(R.id.widget_configure_add_btn);

        Bundle extras = getIntent().getExtras();
        if (extras != null) {
            mWidgetId = extras.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID);
        }
        if (mWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        mAddBtn.setOnClickListener(v -> {
            String input = mInput.getText().toString().trim();
            if (input.isEmpty()) {
                showError("URL 또는 토큰을 입력해 주세요.");
                return;
            }
            String token = extractToken(input);
            if (token == null || token.isEmpty()) {
                showError("올바른 URL 또는 토큰을 입력해 주세요.");
                return;
            }
            mAddBtn.setEnabled(false);
            mAddBtn.setText("확인 중...");
            mError.setVisibility(View.GONE);
            validateAndAdd(token);
        });
    }

    String extractToken(String input) {
        if (input.startsWith("http://") || input.startsWith("https://")) {
            try {
                URL u = new URL(input);
                String path = u.getPath().replaceAll("^/+", "");
                // /embed/TOKEN 또는 /TOKEN 형식 처리
                String[] parts = path.split("/");
                for (String p : parts) {
                    if (!p.isEmpty() && !p.equals("embed")) return p;
                }
                return null;
            } catch (Exception e) { return null; }
        }
        return input;
    }

    void validateAndAdd(String token) {
        ExecutorService exec = Executors.newSingleThreadExecutor();
        exec.execute(() -> {
            String[] res = fetchCalName(token);
            runOnUiThread(() -> {
                if (res[1] != null) {
                    showError(res[1]);
                    mAddBtn.setEnabled(true);
                    mAddBtn.setText("위젯 추가");
                } else {
                    String calName = res[0];
                    CalendarWidget.savePrefs(this, mWidgetId, token, calName);

                    AppWidgetManager mgr = AppWidgetManager.getInstance(this);
                    CalendarWidget.updateWidget(this, mgr, mWidgetId);

                    Intent result = new Intent();
                    result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, mWidgetId);
                    setResult(RESULT_OK, result);
                    finish();
                }
            });
            exec.shutdown();
        });
    }

    String[] fetchCalName(String token) {
        try {
            HttpURLConnection conn = (HttpURLConnection)
                    new URL(CalendarWidget.API_BASE + "/api/sessions/" + token).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            int code = conn.getResponseCode();
            if (code == 200) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
                br.close();
                conn.disconnect();
                String name = new JSONObject(sb.toString()).optString("title", "공유 캘린더");
                return new String[]{name, null};
            } else if (code == 404) {
                return new String[]{null, "캘린더를 찾을 수 없습니다."};
            } else {
                return new String[]{null, "서버 오류 (코드: " + code + ")"};
            }
        } catch (Exception e) {
            return new String[]{null, "네트워크 오류. 인터넷 연결을 확인해 주세요."};
        }
    }

    void showError(String msg) {
        mError.setText(msg);
        mError.setVisibility(View.VISIBLE);
    }
}
