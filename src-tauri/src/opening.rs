use std::{path::PathBuf, sync::Mutex};

#[derive(Default)]
pub struct PendingOpens(Mutex<Vec<PathBuf>>);

impl PendingOpens {
    pub fn enqueue(&self, paths: impl IntoIterator<Item = PathBuf>) -> Result<(), String> {
        let mut pending = self.0.lock().map_err(|error| error.to_string())?;
        for path in paths {
            if !pending.contains(&path) {
                pending.push(path);
            }
        }
        Ok(())
    }

    pub fn take(&self) -> Result<Vec<PathBuf>, String> {
        let mut pending = self.0.lock().map_err(|error| error.to_string())?;
        Ok(std::mem::take(&mut *pending))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retains_startup_requests_until_the_frontend_is_ready() {
        let pending = PendingOpens::default();
        pending.enqueue([PathBuf::from("/docs/one.md")]).unwrap();
        pending
            .enqueue([PathBuf::from("/docs/one.md"), PathBuf::from("/docs/two.md")])
            .unwrap();
        assert_eq!(
            pending.take().unwrap(),
            [PathBuf::from("/docs/one.md"), PathBuf::from("/docs/two.md")]
        );
        assert!(pending.take().unwrap().is_empty());
        pending.enqueue([PathBuf::from("/docs/one.md")]).unwrap();
        assert_eq!(pending.take().unwrap(), [PathBuf::from("/docs/one.md")]);
    }
}
