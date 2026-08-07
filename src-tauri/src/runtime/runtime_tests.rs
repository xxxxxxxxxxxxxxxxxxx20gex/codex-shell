use super::RUNTIME_FILE_NAME;
use super::find_on_path;
use super::resolve_candidate;
use std::env;
use std::ffi::OsString;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::time::SystemTime;
use std::time::UNIX_EPOCH;

struct TestDirectory(PathBuf);

impl TestDirectory {
    fn new() -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after the Unix epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "codex-shell-runtime-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir_all(&path).expect("test directory should be created");
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }

    fn add_runtime(&self, directory: &str) -> PathBuf {
        let directory = self.0.join(directory);
        fs::create_dir_all(&directory).expect("runtime directory should be created");
        let runtime = directory.join(RUNTIME_FILE_NAME);
        fs::write(&runtime, b"test runtime").expect("test runtime should be created");
        runtime
            .canonicalize()
            .expect("test runtime should have a canonical path")
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn resolves_relative_override_against_current_directory() {
    let directory = TestDirectory::new();
    let expected = directory.add_runtime("runtime");

    let resolved = resolve_candidate(Path::new("runtime/codex.exe"), directory.path());

    assert_eq!(resolved, Some(expected));
}

#[test]
fn appends_runtime_name_when_override_is_a_directory() {
    let directory = TestDirectory::new();
    let expected = directory.add_runtime("runtime");

    let resolved = resolve_candidate(Path::new("runtime"), directory.path());

    assert_eq!(resolved, Some(expected));
}

#[test]
fn finds_runtime_in_first_existing_path_entry() {
    let directory = TestDirectory::new();
    let missing = directory.path().join("missing");
    let expected = directory.add_runtime("available");
    let search_path: OsString = env::join_paths([
        missing,
        expected
            .parent()
            .expect("runtime should have a parent")
            .to_path_buf(),
    ])
    .expect("test search path should be valid");

    let resolved = find_on_path(Some(&search_path));

    assert_eq!(resolved, Some(expected));
}
