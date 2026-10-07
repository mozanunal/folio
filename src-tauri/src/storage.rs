use std::{
    collections::HashSet,
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Default)]
pub(crate) struct WorkspaceAccess {
    pub(crate) files: Mutex<HashSet<PathBuf>>,
    pub(crate) directories: Mutex<HashSet<PathBuf>>,
}

impl WorkspaceAccess {
    pub(crate) fn authorize(&self, path: &Path) -> Result<PathBuf, String> {
        let canonical = path.canonicalize().map_err(|e| e.to_string())?;
        let files = self.files.lock().map_err(|e| e.to_string())?;
        let directories = self.directories.lock().map_err(|e| e.to_string())?;
        if files.contains(&canonical) || directories.iter().any(|root| canonical.starts_with(root))
        {
            Ok(canonical)
        } else {
            Err("Choose this file or directory using Open first.".into())
        }
    }
}

pub(crate) fn save_checked(
    path: &Path,
    content: &str,
    expected: Option<&str>,
) -> Result<(), String> {
    if path.exists() {
        let disk = fs::read_to_string(path).map_err(|e| e.to_string())?;
        if expected != Some(disk.as_str()) {
            return Err(
                "The file changed on disk. Reopen it or use Save As to keep both versions.".into(),
            );
        }
    } else if expected.is_some() {
        return Err("The file was removed from disk. Use Save As to restore it.".into());
    }
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let temporary = path.with_file_name(format!(".folio-{}-{nonce}.tmp", std::process::id()));
    let result = (|| {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)
            .map_err(|e| e.to_string())?;
        file.write_all(content.as_bytes())
            .map_err(|e| e.to_string())?;
        if let Ok(metadata) = fs::metadata(path) {
            file.set_permissions(metadata.permissions())
                .map_err(|e| e.to_string())?;
        }
        file.sync_all().map_err(|e| e.to_string())?;
        fs::rename(&temporary, path).map_err(|e| e.to_string())
    })();
    if result.is_err() {
        let _ = fs::remove_file(temporary);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn save_refuses_external_changes_and_preserves_original() {
        let path = std::env::temp_dir().join(format!("folio-save-test-{}.md", std::process::id()));
        fs::write(&path, "external edit").unwrap();
        assert!(save_checked(&path, "replacement", Some("old content")).is_err());
        assert_eq!(fs::read_to_string(&path).unwrap(), "external edit");
        save_checked(&path, "replacement", Some("external edit")).unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "replacement");
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn access_does_not_allow_unselected_files() {
        let access = WorkspaceAccess::default();
        let path = std::env::current_dir().unwrap();
        assert!(access.authorize(&path).is_err());
        access
            .directories
            .lock()
            .unwrap()
            .insert(path.canonicalize().unwrap());
        assert!(access.authorize(&path).is_ok());
    }
}
