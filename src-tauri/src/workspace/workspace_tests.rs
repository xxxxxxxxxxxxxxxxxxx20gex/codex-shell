use super::default_workspace_paths;
use std::path::Path;

#[test]
fn builds_a_product_isolated_daily_workspace() {
    let workspace =
        default_workspace_paths(Path::new("C:\\Users\\example\\Documents"), "2026-08-10");

    assert_eq!(
        workspace.root_path,
        Path::new("C:\\Users\\example\\Documents").join("Codex-Shell")
    );
    assert_eq!(workspace.path, workspace.root_path.join("2026-08-10"));
}
