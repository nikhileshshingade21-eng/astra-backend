# Geofence Fix for Class 214

- **Identified mismatch**: The coordinates for "Class 214" in the database (`17.279279, 78.5543`) were roughly 327 meters away from the actual classroom location where the student was standing.
- **Updated database**: Ran a database script to update the `lat` and `lng` for "Class 214" to exactly match the GPS coordinates in the student's screenshot (`17.282058, 78.553303`) and increased the acceptable radius to 50 meters standard.
- **Cleared backend cache**: Pushed an empty commit to trigger a Railway server restart, which wipes the in-memory coordinate caches and forces the system to pull the fresh geofence data.

The student will now be located "0m" away from the center of the zone and easily within the 50m radius.
