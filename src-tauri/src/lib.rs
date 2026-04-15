use tauri::{AppHandle, LogicalSize, Manager};

#[tauri::command]
fn resize_idle(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_size(LogicalSize::new(1920.0_f64, 1080.0_f64));
    }
}

#[tauri::command]
fn resize_active(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_size(LogicalSize::new(1920.0_f64, 1080.0_f64));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![resize_idle, resize_active])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
