# Cloud Sync

Cloud sync and account authentication are not part of the current ModelWise release.

- Comparison sessions and preferences remain in browser IndexedDB.
- Active provider keys remain in memory by default.
- The optional encrypted device vault also remains local to the browser.
- Session export/import provides manual backup and transfer between devices.

Legacy sync-related IndexedDB stores may remain in existing browser databases for schema compatibility, but the active application does not create sync jobs or contact a cloud database.
