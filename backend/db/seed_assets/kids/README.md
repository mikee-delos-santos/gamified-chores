# Kid avatar photos

Drop each kid's avatar image here, named after the kid (lowercase), then run:

```
bundle exec rails chores:seed_kid_photos
```

The task matches files by the kid's name (case-insensitive) and one of these extensions:
`jpg`, `jpeg`, `png`, `webp`. For example:

```
db/seed_assets/kids/julia.jpg
db/seed_assets/kids/cyrus.png
```

Square images work best (they render as a circular badge on the Done & archived cards).
The task is idempotent: it re-attaches only when the file name or size changes, so it is
safe to re-run against production after replacing a photo.
