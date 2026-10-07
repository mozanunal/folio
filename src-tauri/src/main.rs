#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
};
mod storage;
use storage::{save_checked, WorkspaceAccess};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
struct Document {
    path: String,
    content: String,
}

#[derive(Serialize)]
struct Entry {
    path: String,
    name: String,
    directory: bool,
}

fn load_document(path: PathBuf) -> Result<Document, String> {
    if fs::metadata(&path).map_err(|e| e.to_string())?.len() > 20 * 1024 * 1024 {
        return Err("This prototype supports documents up to 20 MB.".into());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(Document {
        path: path.to_string_lossy().into_owned(),
        content,
    })
}

fn allow_images(app: &tauri::AppHandle, path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        app.asset_protocol_scope()
            .allow_directory(parent, true)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn choose_file(
    app: tauri::AppHandle,
    access: State<'_, WorkspaceAccess>,
) -> Result<Option<Document>, String> {
    let selection = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown", "txt"])
        .blocking_pick_file();
    let Some(selection) = selection else {
        return Ok(None);
    };
    let path = selection
        .into_path()
        .map_err(|e| e.to_string())?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    access
        .files
        .lock()
        .map_err(|e| e.to_string())?
        .insert(path.clone());
    allow_images(&app, &path)?;
    load_document(path).map(Some)
}

#[tauri::command]
async fn choose_directory(
    app: tauri::AppHandle,
    access: State<'_, WorkspaceAccess>,
) -> Result<Option<String>, String> {
    let Some(selection) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let path = selection
        .into_path()
        .map_err(|e| e.to_string())?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    access
        .directories
        .lock()
        .map_err(|e| e.to_string())?
        .insert(path.clone());
    app.asset_protocol_scope()
        .allow_directory(&path, true)
        .map_err(|e| e.to_string())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn list_directory(path: String, access: State<'_, WorkspaceAccess>) -> Result<Vec<Entry>, String> {
    let path = access.authorize(Path::new(&path))?;
    let mut entries = Vec::new();
    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let kind = entry.file_type().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') || kind.is_symlink() || name == "node_modules" || name == "target"
        {
            continue;
        }
        let path = entry.path();
        let markdown = path
            .extension()
            .and_then(|s| s.to_str())
            .is_some_and(|s| matches!(s.to_lowercase().as_str(), "md" | "markdown" | "txt"));
        if kind.is_dir() || markdown {
            entries.push(Entry {
                path: path.to_string_lossy().into_owned(),
                name,
                directory: kind.is_dir(),
            });
        }
    }
    entries.sort_by(|a, b| {
        b.directory
            .cmp(&a.directory)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

#[tauri::command]
fn read_document(path: String, access: State<'_, WorkspaceAccess>) -> Result<Document, String> {
    load_document(access.authorize(Path::new(&path))?)
}

#[tauri::command]
async fn save_document(
    app: tauri::AppHandle,
    access: State<'_, WorkspaceAccess>,
    path: Option<String>,
    content: String,
    expected: Option<String>,
) -> Result<Option<String>, String> {
    let (path, expected) = match path {
        Some(path) => (access.authorize(Path::new(&path))?, expected),
        None => {
            let Some(selection) = app
                .dialog()
                .file()
                .add_filter("Markdown", &["md", "markdown"])
                .set_file_name("Untitled.md")
                .blocking_save_file()
            else {
                return Ok(None);
            };
            let path = selection.into_path().map_err(|e| e.to_string())?;
            let expected = if path.exists() {
                Some(fs::read_to_string(&path).map_err(|e| e.to_string())?)
            } else {
                None
            };
            (path, expected)
        }
    };
    save_checked(&path, &content, expected.as_deref())?;
    let path = path.canonicalize().map_err(|e| e.to_string())?;
    access
        .files
        .lock()
        .map_err(|e| e.to_string())?
        .insert(path.clone());
    allow_images(&app, &path)?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(WorkspaceAccess::default())
        .invoke_handler(tauri::generate_handler![
            choose_file,
            choose_directory,
            list_directory,
            read_document,
            save_document
        ])
        .run(tauri::generate_context!())
        .expect("could not start Folio");
}
