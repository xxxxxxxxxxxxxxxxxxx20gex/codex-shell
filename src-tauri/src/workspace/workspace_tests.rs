use super::{default_project_directory_paths, reveal_path_in_explorer};
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
fn rejects_relative_and_missing_explorer_targets() {
    assert!(reveal_path_in_explorer("relative.txt".into()).is_err());
    let directory = tempfile::tempdir().unwrap();
    assert!(reveal_path_in_explorer(directory.path().join("missing.txt").to_string_lossy().into_owned()).is_err());
}

#[test]
#[ignore = "opens Windows Explorer; run explicitly on an interactive desktop"]
fn reveals_file_on_windows_desktop() {
    let path = std::env::var("CS_EXPLORER_TEST_PATH").expect("set a real file path");
    reveal_path_in_explorer(path).unwrap();
}
