The library as a Dataview table:

```dataview
TABLE author AS "Author", year AS "Year", status AS "Status"
FROM "Library"
SORT year ASC
```

Open tasks in the tour, as a Dataview task list:

```dataview
TASK FROM "Tour" WHERE !completed
```
