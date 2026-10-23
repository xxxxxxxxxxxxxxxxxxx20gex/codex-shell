use tauri::WebviewWindow;
use windows::{
    Win32::{
        Foundation::{HINSTANCE, LPARAM, WPARAM},
        System::LibraryLoader::GetModuleHandleW,
        UI::WindowsAndMessaging::{
            IMAGE_ICON, LR_DEFAULTSIZE, LR_SHARED, LoadImageW, SendMessageW, WM_SETICON,
        },
    },
    core::PCWSTR,
};

pub fn set_taskbar_icon(window: &WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    let hwnd = window.hwnd()?;
    // Tao sets only ICON_SMALL. Windows needs ICON_BIG for the running taskbar button.
    // Tauri embeds the application ICO as resource 32512; LR_SHARED keeps it alive
    // with the executable module, so the window never holds a freed icon handle.
    unsafe {
        let module = GetModuleHandleW(None)?;
        let icon = LoadImageW(
            Some(HINSTANCE(module.0)),
            PCWSTR(32512_usize as *const u16),
            IMAGE_ICON,
            0,
            0,
            LR_DEFAULTSIZE | LR_SHARED,
        )?;
        SendMessageW(hwnd, WM_SETICON, Some(WPARAM(1)), Some(LPARAM(icon.0 as isize)));
    }
    Ok(())
}
