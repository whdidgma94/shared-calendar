package com.app.sharedcalendar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CalendarWidget extends AppWidgetProvider {

    static final String PREFS_NAME = "CalendarWidget";
    static final String PREF_TOKEN  = "widget_token_";
    static final String PREF_NAME   = "widget_name_";
    static final String API_BASE    = "https://shared-calendar-5nyi.onrender.com";
    static final String ACTION_REFRESH = "com.app.sharedcalendar.WIDGET_REFRESH";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateWidget(ctx, mgr, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID);
            if (id != AppWidgetManager.INVALID_APPWIDGET_ID) {
                updateWidget(ctx, AppWidgetManager.getInstance(ctx), id);
            }
        }
    }

    @Override
    public void onDeleted(Context ctx, int[] ids) {
        SharedPreferences.Editor ed = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        for (int id : ids) {
            ed.remove(PREF_TOKEN + id);
            ed.remove(PREF_NAME + id);
        }
        ed.apply();
    }

    static void updateWidget(Context ctx, AppWidgetManager mgr, int widgetId) {
        String token   = getToken(ctx, widgetId);
        String calName = getName(ctx, widgetId);

        RemoteViews views = buildBaseViews(ctx, widgetId, calName, "불러오는 중...", "", "");
        mgr.updateAppWidget(widgetId, views);

        if (token == null) {
            RemoteViews v = buildBaseViews(ctx, widgetId, calName, "캘린더를 설정해 주세요", "", "");
            mgr.updateAppWidget(widgetId, v);
            return;
        }

        ExecutorService exec = Executors.newSingleThreadExecutor();
        exec.execute(() -> {
            List<String> lines = fetchEvents(token);
            String l1 = lines.size() > 0 ? lines.get(0) : "예정된 일정이 없습니다";
            String l2 = lines.size() > 1 ? lines.get(1) : "";
            String l3 = lines.size() > 2 ? lines.get(2) : "";
            RemoteViews v = buildBaseViews(ctx, widgetId, calName, l1, l2, l3);
            mgr.updateAppWidget(widgetId, v);
            exec.shutdown();
        });
    }

    private static RemoteViews buildBaseViews(Context ctx, int widgetId,
            String calName, String l1, String l2, String l3) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_calendar);
        v.setTextViewText(R.id.widget_title, calName != null ? calName : "공유 캘린더");
        v.setTextViewText(R.id.event_text_1, l1);
        v.setTextViewText(R.id.event_text_2, l2);
        v.setTextViewText(R.id.event_text_3, l3);

        // 앱 열기
        Intent launch = new Intent(ctx, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent piLaunch = PendingIntent.getActivity(ctx, widgetId, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.widget_open_btn, piLaunch);

        // 새로고침
        Intent refresh = new Intent(ctx, CalendarWidget.class);
        refresh.setAction(ACTION_REFRESH);
        refresh.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        PendingIntent piRefresh = PendingIntent.getBroadcast(ctx, widgetId, refresh,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.widget_refresh_btn, piRefresh);

        return v;
    }

    private static List<String> fetchEvents(String token) {
        List<String> result = new ArrayList<>();
        try {
            SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            iso.setTimeZone(TimeZone.getTimeZone("UTC"));

            Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
            cal.set(Calendar.HOUR_OF_DAY, 0);
            cal.set(Calendar.MINUTE, 0);
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            String from = iso.format(cal.getTime());

            cal.add(Calendar.DAY_OF_YEAR, 30);
            String to = iso.format(cal.getTime());

            String urlStr = API_BASE + "/api/sessions/" + token + "/events"
                    + "?from=" + Uri.encode(from) + "&to=" + Uri.encode(to);

            HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            if (conn.getResponseCode() == 200) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
                br.close();

                JSONArray arr = new JSONArray(sb.toString());
                SimpleDateFormat disp = new SimpleDateFormat("M/d(EEE) HH:mm", Locale.KOREAN);
                disp.setTimeZone(TimeZone.getDefault());
                SimpleDateFormat dayFmt = new SimpleDateFormat("M/d(EEE)", Locale.KOREAN);
                dayFmt.setTimeZone(TimeZone.getDefault());

                for (int i = 0; i < arr.length() && i < 3; i++) {
                    JSONObject ev = arr.getJSONObject(i);
                    boolean allDay = ev.optBoolean("allDay", false);
                    Date start = iso.parse(ev.getString("startAt"));
                    String dateLabel = allDay ? dayFmt.format(start) : disp.format(start);
                    result.add("• " + dateLabel + "  " + ev.getString("title"));
                }
            }
            conn.disconnect();
        } catch (Exception ignored) {}
        return result;
    }

    // ── SharedPreferences 헬퍼 ──────────────────────────────────────────────

    static void savePrefs(Context ctx, int widgetId, String token, String name) {
        ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
                .putString(PREF_TOKEN + widgetId, token)
                .putString(PREF_NAME  + widgetId, name)
                .apply();
    }

    static String getToken(Context ctx, int widgetId) {
        return ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(PREF_TOKEN + widgetId, null);
    }

    static String getName(Context ctx, int widgetId) {
        return ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(PREF_NAME + widgetId, "공유 캘린더");
    }
}
