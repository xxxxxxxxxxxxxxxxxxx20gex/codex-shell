use super::RUNTIME_FILE_NAME;
use super::bundled_tool_path;
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

#[test]
fn bundled_tools_require_the_shipped_executable() {
    let directory = TestDirectory::new();
    assert!(bundled_tool_path(&directory.path().join("cs.exe"), None).is_err());
}

#[test]
fn bundled_tools_prepend_application_directory_and_preserve_path() {
    let directory = TestDirectory::new();
    fs::write(directory.path().join("rg.exe"), b"test").unwrap();
    let inherited = env::join_paths([directory.path().join("other tools")]).unwrap();
    let result = bundled_tool_path(&directory.path().join("cs.exe"), Some(&inherited)).unwrap();
    assert_eq!(
        env::split_paths(&result).collect::<Vec<_>>(),
        vec![
            directory.path().to_path_buf(),
            directory.path().join("other tools")
        ]
    );
    let without_path = bundled_tool_path(&directory.path().join("cs.exe"), None).unwrap();
    assert_eq!(
        env::split_paths(&without_path).collect::<Vec<_>>(),
        vec![directory.path()]
    );
}

#[cfg(windows)]
#[test]
fn powershell_finds_bundled_rg_without_host_tools_on_path() {
    let directory = TestDirectory::new();
    let tools = directory.path().join("CS tools with spaces");
    fs::create_dir(&tools).unwrap();
    fs::copy(
        Path::new(env!("CARGO_MANIFEST_DIR")).join("binaries/rg-x86_64-pc-windows-msvc.exe"),
        tools.join("rg.exe"),
    )
    .expect("run pnpm tools:stage before Rust tests");
    fs::write(
        directory.path().join("sample.txt"),
        "bundled-rg-search-proof\n",
    )
    .unwrap();
    let original_path = env::var_os("PATH");
    let path = bundled_tool_path(&tools.join("cs.exe"), None).unwrap();
    let powershell = PathBuf::from(env::var_os("SystemRoot").unwrap())
        .join("System32/WindowsPowerShell/v1.0/powershell.exe");
    let output = std::process::Command::new(powershell)
        .args(["-NoProfile", "-NonInteractive", "-Command",
            "rg --version; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; rg --fixed-strings bundled-rg-search-proof sample.txt; exit $LASTEXITCODE"])
        .current_dir(directory.path())
        .env("PATH", path)
        .output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("ripgrep 15.2.0"));
    assert!(stdout.contains("bundled-rg-search-proof"));
    assert_eq!(env::var_os("PATH"), original_path);
}
