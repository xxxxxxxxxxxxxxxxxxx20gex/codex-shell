use tauri::{PhysicalPosition, PhysicalSize, WebviewWindow};

fn restore_geometry(
    origin: PhysicalPosition<i32>,
    available: PhysicalSize<u32>,
    scale: f64,
) -> (PhysicalPosition<i32>, PhysicalSize<u32>, PhysicalSize<u32>) {
    let minimum = PhysicalSize::new(
        (900.0 * scale).round().min(available.width as f64) as u32,
        (640.0 * scale).round().min(available.height as f64) as u32,
    );
    let size = PhysicalSize::new(
        ((available.width as f64 * 0.85).round() as u32).max(minimum.width),
        ((available.height as f64 * 0.85).round() as u32).max(minimum.height),
    );
    let position = PhysicalPosition::new(
        origin.x + ((available.width - size.width) / 2) as i32,
        origin.y + ((available.height - size.height) / 2) as i32,
    );
    (position, size, minimum)
}

pub fn restore_to_monitor(window: &WebviewWindow) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("无法获取当前显示器的可用区域")?;
    let area = monitor.work_area();
    let (position, size, minimum) =
        restore_geometry(area.position, area.size, monitor.scale_factor());
    window.unmaximize().map_err(|e| e.to_string())?;
    // Tauri sizes the client area; Windows keeps resize borders even without decorations.
    let outer = window.outer_size().map_err(|e| e.to_string())?;
    let inner = window.inner_size().map_err(|e| e.to_string())?;
    let border_width = outer.width.saturating_sub(inner.width);
    let border_height = outer.height.saturating_sub(inner.height);
    window
        .set_min_size(Some(PhysicalSize::new(
            minimum.width.saturating_sub(border_width),
            minimum.height.saturating_sub(border_height),
        )))
        .map_err(|e| e.to_string())?;
    window
        .set_size(PhysicalSize::new(
            size.width.saturating_sub(border_width),
            size.height.saturating_sub(border_height),
        ))
        .map_err(|e| e.to_string())?;
    window.set_position(position).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toggle_window_maximized(window: WebviewWindow) -> Result<(), String> {
    if window.is_maximized().map_err(|e| e.to_string())? {
        restore_to_monitor(&window)
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn centers_in_work_area_including_negative_monitor_origins() {
        let (position, size, minimum) = restore_geometry(
            PhysicalPosition::new(-1920, 40),
            PhysicalSize::new(1920, 1040),
            1.0,
        );
        assert_eq!(size, PhysicalSize::new(1632, 884));
        assert_eq!(position, PhysicalPosition::new(-1776, 118));
        assert_eq!(minimum, PhysicalSize::new(900, 640));
    }

    #[test]
    fn respects_dpi_minimum_without_exceeding_small_work_areas() {
        for (width, height, scale) in [
            (1920, 1040, 1.25),
            (1920, 1040, 1.5),
            (1280, 680, 1.5),
            (800, 560, 1.0),
            (1440, 900, 1.0),
            (1280, 780, 1.0),
            (1024, 720, 1.0),
            (900, 700, 1.0),
        ] {
            let (position, size, minimum) = restore_geometry(
                PhysicalPosition::new(0, 0),
                PhysicalSize::new(width, height),
                scale,
            );
            assert!(size.width <= width && size.height <= height);
            assert!(size.width >= minimum.width && size.height >= minimum.height);
            assert!((position.x * 2 + size.width as i32 - width as i32).abs() <= 1);
            assert!((position.y * 2 + size.height as i32 - height as i32).abs() <= 1);
        }
        let (_, size, _) = restore_geometry(
            PhysicalPosition::new(0, 0),
            PhysicalSize::new(1280, 680),
            1.5,
        );
        assert_eq!(size, PhysicalSize::new(1280, 680));
    }
}
