fn main() {
    // Tauri copies sidecars only when this build script runs. Track staged
    // binaries so an incremental build cannot retain the previous Runtime.
    println!("cargo:rerun-if-changed=binaries");
    tauri_build::build()
}
