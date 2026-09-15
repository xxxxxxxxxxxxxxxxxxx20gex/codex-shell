use super::{default_project_directory_paths, explorer_select_argument};
use std::path::Path;

#[test]
fn builds_a_product_isolated_daily_project_directory() {
    let workspace =
        default_project_directory_paths(Path::new("C:\\Users\\example\\Documents"), "2026-08-10");

    assert_eq!(
        workspace.root_path,
        Path::new("C:\\Users\\example\\Documents").join("Codex-Shell")
    );
    assert_eq!(workspace.path, workspace.root_path.join("2026-08-10"));
}

#[test]
fn builds_a_single_argument_for_explorer_file_selection() {
    let path = Path::new(r#"C:\Users\example\Documents\Codex Shell\image.png"#);

    assert_eq!(
        explorer_select_argument(path),
        r#"/select,"C:\Users\example\Documents\Codex Shell\image.png""#
    );
}
