use super::{prepare_default_path, validate_isolated_path};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT_TEST_DIRECTORY: AtomicUsize = AtomicUsize::new(0);

struct TestDirectory(PathBuf);

impl TestDirectory {
    fn new(name: &str) -> Self {
        let sequence = NEXT_TEST_DIRECTORY.fetch_add(1, Ordering::Relaxed);
        Self(std::env::temp_dir().join(format!(
            "codex-shell-{name}-{}-{sequence}",
            std::process::id()
        )))
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn rejects_paths_that_overlap_official_codex_home() {
    let user_home = PathBuf::from("C:\\Users\\example");
    let official_home = user_home.join(".codex");

    assert!(validate_isolated_path(&official_home, &official_home).is_err());
    assert!(validate_isolated_path(&official_home.join("nested"), &official_home).is_err());
    assert!(validate_isolated_path(&user_home, &official_home).is_err());
    assert!(validate_isolated_path(&user_home.join(".codex-shell"), &official_home).is_ok());
}

#[test]
fn migrates_legacy_home_before_using_new_default() {
    let root = TestDirectory::new("codex-home-migration");
    let legacy_home = root.0.join("legacy");
    let default_home = root.0.join(".codex-shell");
    let official_home = root.0.join(".codex");
    fs::create_dir_all(legacy_home.join("sessions")).expect("create legacy sessions");
    fs::write(legacy_home.join("sessions").join("thread.jsonl"), "thread")
        .expect("write legacy thread");

    let resolved = prepare_default_path(&default_home, &legacy_home, &official_home)
        .expect("migrate legacy home");

    assert_eq!(
        resolved,
        default_home.canonicalize().expect("canonical default home")
    );
    assert!(!legacy_home.exists());
    assert_eq!(
        fs::read_to_string(default_home.join("sessions").join("thread.jsonl"))
            .expect("read migrated thread"),
        "thread"
    );
}

#[test]
fn migrates_legacy_home_when_new_default_is_empty() {
    let root = TestDirectory::new("codex-home-empty-default");
    let legacy_home = root.0.join("legacy");
    let default_home = root.0.join(".codex-shell");
    let official_home = root.0.join(".codex");
    fs::create_dir_all(&default_home).expect("create empty default home");
    fs::create_dir_all(legacy_home.join("sessions")).expect("create legacy sessions");
    fs::write(legacy_home.join("sessions").join("thread.jsonl"), "thread")
        .expect("write legacy thread");

    prepare_default_path(&default_home, &legacy_home, &official_home)
        .expect("migrate into empty default home");

    assert!(!legacy_home.exists());
    assert_eq!(
        fs::read_to_string(default_home.join("sessions").join("thread.jsonl"))
            .expect("read migrated thread"),
        "thread"
    );
}

#[test]
fn rejects_two_non_empty_homes_without_modifying_either() {
    let root = TestDirectory::new("codex-home-conflict");
    let legacy_home = root.0.join("legacy");
    let default_home = root.0.join(".codex-shell");
    let official_home = root.0.join(".codex");
    fs::create_dir_all(&legacy_home).expect("create legacy home");
    fs::create_dir_all(&default_home).expect("create default home");
    fs::write(legacy_home.join("legacy.txt"), "legacy").expect("write legacy data");
    fs::write(default_home.join("default.txt"), "default").expect("write default data");

    let error = prepare_default_path(&default_home, &legacy_home, &official_home)
        .expect_err("conflicting homes must be rejected");

    assert!(error.contains("两个非空"));
    assert_eq!(
        fs::read_to_string(legacy_home.join("legacy.txt")).expect("legacy data remains"),
        "legacy"
    );
    assert_eq!(
        fs::read_to_string(default_home.join("default.txt")).expect("default data remains"),
        "default"
    );
}
