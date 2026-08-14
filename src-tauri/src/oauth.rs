use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;
use std::time::{Duration, Instant};

use tauri::Emitter;

/// Loopback redirect port for the OAuth flow (desktop-app PKCE). A tiny
/// one-shot HTTP server listens here while the system browser performs the
/// Google consent; the redirect arrives as a plain GET request.
pub const REDIRECT_PORT: u16 = 45467;

/// Maximum wait for the browser redirect before the server gives up.
const SERVER_TIMEOUT: Duration = Duration::from_secs(3 * 60);

/// Starts the local redirect server and returns immediately. The server runs
/// in a background thread: it waits for `GET /oauth?...` on 127.0.0.1:45467,
/// serves a small "you can close this page" page so the browser does not show
/// an error, emits the full redirect URL as `oauth:callback`, then shuts down.
#[tauri::command]
pub fn start_oauth_server(app: tauri::AppHandle) -> Result<(), String> {
    let listener = TcpListener::bind(("127.0.0.1", REDIRECT_PORT))
        .map_err(|error| format!("oauth server bind failed: {error}"))?;
    let handle = app.clone();
    thread::spawn(move || {
        listener.set_nonblocking(true).expect("nonblocking listener");
        let deadline = Instant::now() + SERVER_TIMEOUT;
        while Instant::now() < deadline {
            match listener.accept() {
                Ok((stream, _)) => {
                    if let Some(url) = handle_request(stream) {
                        let _ = handle.emit("oauth:callback", url);
                        return;
                    }
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(50));
                }
                Err(_) => return,
            }
        }
    });
    Ok(())
}

/// Reads one request; returns the full redirect URL when it was the OAuth
/// callback (the server can then stop). Other requests get a 404 and the
/// loop keeps waiting.
fn handle_request(mut stream: TcpStream) -> Option<String> {
    let mut buffer = [0u8; 8192];
    let read = stream.read(&mut buffer).ok()?;
    let request = String::from_utf8_lossy(&buffer[..read]);
    let target = request.split_whitespace().nth(1).unwrap_or("/");
    let is_redirect = target.starts_with("/oauth?");
    let body = if is_redirect {
        "<!doctype html><html lang=\"ar\"><body style=\"font-family:sans-serif;text-align:center;padding-top:4rem\"><h2>تم تسجيل الدخول، يمكنك إغلاق هذه الصفحة</h2><p>Signed in — you may close this page.</p></body></html>"
    } else {
        "<!doctype html><html><body>Not found</body></html>"
    };
    let status = if is_redirect { "200 OK" } else { "404 Not Found" };
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes());
    is_redirect.then(|| request_to_url(&request))
}

/// Rebuilds the full redirect URL (`http://<host><path>?<query>`) exactly as
/// the browser requested it — the frontend parses the same URL format as the
/// old webview interception produced.
fn request_to_url(request: &str) -> String {
    let target = request.split_whitespace().nth(1).unwrap_or("/oauth?");
    let host = request
        .lines()
        .find(|line| line.to_ascii_lowercase().starts_with("host:"))
        .and_then(|line| line.split_once(':').map(|(_, value)| value.trim()))
        .unwrap_or("127.0.0.1");
    format!("http://{host}{target}")
}