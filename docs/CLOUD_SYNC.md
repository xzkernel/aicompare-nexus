# Cloud Sync

Cloud sync and account authentication are not implemented by ModelWise.

- Comparison sessions and preferences remain in browser IndexedDB.
- Active provider keys remain in memory by default.
- The optional encrypted device vault also remains local to the browser.
- Session export/import provides manual backup and transfer between devices.

Older browser databases may contain unused sync-related stores for schema compatibility. The application does not create sync jobs or connect to a cloud database.
