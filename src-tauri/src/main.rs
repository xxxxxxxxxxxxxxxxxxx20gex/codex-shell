// Codex Shell is a desktop GUI in both debug and release builds.
#![cfg_attr(windows, windows_subsystem = "windows")]

fn main() {
    codex_shell_lib::run()
}
