# Input JSON Schema Specification

This document provides a detailed specification of the JSON schema accepted by the **Student Schedule Optimizer**.

The JSON file describes the schedule metadata, hierarchical requirement groups, courses, and time sessions.

---

## 1. Top-Level Structure

The root JSON object must contain exactly three top-level keys:

```json
{
  "meta": { ... },
  "groups": [ ... ],
  "classes": [ ... ]
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `meta` | `Object` | **Yes** | Schedule boundaries, term name, and active days. |
| `groups` | `Array<Group>` | **Yes** | Hierarchical requirement groups and section clusters (can be empty `[]`). |
| `classes` | `Array<Class>` | **Yes** | Course offerings, lectures, labs, and tutorials. |

---

## 2. The `meta` Object

The `meta` object defines the grid boundaries and day sequence for the weekly schedule.

```json
"meta": {
  "termName": "Fall 2026",
  "dayOrder": ["Sun", "Mon", "Tue", "Wed", "Thu"],
  "dayStart": "08:00",
  "dayEnd": "18:00"
}
```

### Fields

| Field | Type | Format / Allowed Values | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `termName` | `string` | Free text (e.g., `"Fall 2026"`) | No | Academic term display title. Defaults to `"Schedule"` if omitted. |
| `dayOrder` | `Array<string>` | Day codes (e.g., `["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]`) | **Yes** | Non-empty list of days displayed from top to bottom on the schedule grid. |
| `dayStart` | `string` | 24-hour `"HH:MM"` (e.g., `"08:00"`) | **Yes** | Earliest time boundary displayed on the schedule grid. Must be before `dayEnd`. Aligned to 15-minute increments (`:00`, `:15`, `:30`, `:45`). |
| `dayEnd` | `string` | 24-hour `"HH:MM"` (e.g., `"18:00"`) | **Yes** | Latest time boundary displayed on the schedule grid. Must be after `dayStart`. Aligned to 15-minute increments. |

---

## 3. The `groups` Array

Groups model structural course choices, including tracks, majors, lab/tutorial section bundles, corequisites, and electives.

### Arbitrary Tree Nesting via `parentId`
Groups are stored as a **flat array** where each group references its parent via `parentId`:
- Root groups have `"parentId": null` (or omitted).
- Child groups specify the `id` of their parent group in `parentId`.
- Groups can nest to **any depth** (e.g., Major Group &rarr; Lab Section &rarr; Sub-team).

### Sibling Mutual Exclusion via `childrenConflict`
Instead of requiring every subgroup or section to exhaustively list all of its siblings in `conflictsWith`, a parent group can set:
```json
"childrenConflict": true
```
When `childrenConflict: true` is set on a parent group, all of its direct child groups are automatically treated as **mutually exclusive** &mdash; the optimizer will pick **at most one** child branch in any generated schedule.

```json
[
  {
    "id": "grp-cs101-section",
    "name": "CS 101 Lab/Tutorial Section",
    "parentId": null,
    "required": true,
    "childrenConflict": true,
    "conflictsWith": []
  },
  {
    "id": "sub-cs-a",
    "name": "Section A (Morning)",
    "parentId": "grp-cs101-section",
    "required": true,
    "childrenConflict": false,
    "conflictsWith": []
  },
  {
    "id": "sub-cs-b",
    "name": "Section B (Afternoon)",
    "parentId": "grp-cs101-section",
    "required": true,
    "childrenConflict": false,
    "conflictsWith": []
  }
]
```

### Group Object Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Unique identifier for the group (e.g. `"grp-cs101-section"`, `"sub-cs-a"`). |
| `name` | `string` | **Yes** | Human-readable name of the group. |
| `parentId` | `string` \| `null` | No (default `null`) | ID of the parent group in the hierarchy. Set to `null` or omit for top-level groups. |
| `required` | `boolean` | **Yes** | If `true`, the solver **must** satisfy this group requirement in every valid schedule. If `false`, the group is optional (e.g., electives). |
| `childrenConflict` | `boolean` | No (default `false`) | If `true`, all direct children of this group are mutually exclusive (pick at most one). |
| `conflictsWith` | `Array<string>` | No (default `[]`) | Array of other group IDs that cannot be taken simultaneously with this group. Used for cross-tree conflicts. Conflicts are symmetric. |

---

## 4. The `classes` Array

Classes represent course offerings, lecture meetings, lab sessions, or tutorials. Each class belongs to at most one group via `groupId` (or `null` if standalone).

```json
{
  "id": "cs101-lab-a",
  "name": "CS 101 Lab (Sec A)",
  "type": "lab",
  "groupId": "sub-cs-a",
  "instructor": "TA Rivera",
  "location": "CS Lab 204",
  "credits": 0,
  "attendAllSessions": false,
  "sessions": [
    { "day": "Mon", "start": "09:00", "end": "11:00" }
  ]
}
```

### Class Object Fields

| Field | Type | Allowed Values | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | Unique identifier string | **Yes** | Unique ID for this class (e.g. `"cs101-lec"`, `"math201"`). |
| `name` | `string` | Free text | **Yes** | Course title (e.g. `"Calculus II"`). |
| `type` | `string` | `"lecture"` \| `"lab"` \| `"tutorial"` \| `"other"` | No (default `"other"`) | Determines color theme and badge type in the user interface. |
| `groupId` | `string` \| `null` | Group `id` or `null` | No (default `null`) | Links this class to its group in the hierarchy. Standalone classes use `null`. |
| `instructor` | `string` | Free text | No | Name of professor or TA. Displayed on chips and tooltips. |
| `location` | `string` | Free text | No | Building/Room location. Displayed on chip tooltips. |
| `credits` | `number` | Numeric (e.g. `3`, `4`) | No (default `0`) | Academic credits. |
| `attendAllSessions` | `boolean` | `true` \| `false` | No (default `false`) | **Session selection mode** (see detailed explanation below). |
| `sessions` | `Array<Session>` | Array of Session objects | **Yes** | List of time slots for this class. Must have at least 1 session. |

---

## 5. Session Behavior: `attendAllSessions`

The `attendAllSessions` boolean controls how the optimizer handles multiple sessions in `sessions`:

### `attendAllSessions: false` (Default &mdash; "Pick-One" Alternative Instances)
- Each item in `sessions` represents an **alternative offering/section** of the class (e.g. choice between Sunday morning OR Monday afternoon).
- The solver selects **exactly one** valid session.
- **Pinning & Crossing off behavior**:
  - Pinning a specific session locks that instance into the schedule and **automatically crosses off all other alternative sessions** of that class.
  - Attempting to uncross an automatically crossed-off alternative will warn the user that an instance is already pinned.
  - Crossing off an individual session removes only that session instance from eligibility, leaving other sessions available.

### `attendAllSessions: true` ("All Sessions Required")
- The class meets multiple times per week (e.g., a lecture that meets on both **Sunday AND Wednesday**).
- The student **must attend all sessions** in the `sessions` array.
- The solver must schedule every session in the array without conflicts.
- Crossing off any single session makes the entire class unschedulable.

---

## 6. The `sessions` Array and Time Rules

Each session object specifies when a class meets:

```json
{
  "day": "Sun",
  "start": "10:00",
  "end": "11:30"
}
```

### Session Object Fields

| Field | Type | Format / Constraints | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `day` | `string` | Must match an entry in `meta.dayOrder` | **Yes** | Day of the week (e.g. `"Sun"`, `"Mon"`). |
| `start` | `string` | 24-hour `"HH:MM"` (e.g. `"09:00"`, `"14:15"`) | **Yes** | Start time. Must be strictly before `end`. Must align to 15-minute intervals. |
| `end` | `string` | 24-hour `"HH:MM"` (e.g. `"10:30"`, `"15:45"`) | **Yes** | End time. Must be strictly after `start`. Must align to 15-minute intervals. |

### 15-Minute Granularity Alignment
All times are computed based on 15-minute increments (`SLOT_MINUTES = 15`):
- Minutes must be `:00`, `:15`, `:30`, or `:45`.
- If an unaligned time is uploaded (e.g. `09:10`), the app automatically warns and rounds to the nearest 15-minute slot.

---

## 7. Complete Reference Example

Below is a complete, valid JSON file demonstrating all features:

```json
{
  "meta": {
    "termName": "Fall 2026",
    "dayOrder": ["Sun", "Mon", "Tue", "Wed", "Thu"],
    "dayStart": "08:00",
    "dayEnd": "18:00"
  },
  "groups": [
    {
      "id": "grp-cs101-section",
      "name": "CS 101 Lab/Tutorial Section",
      "parentId": null,
      "required": true,
      "childrenConflict": true,
      "conflictsWith": []
    },
    {
      "id": "sub-cs-a",
      "name": "Section A (Morning)",
      "parentId": "grp-cs101-section",
      "required": true,
      "childrenConflict": false,
      "conflictsWith": []
    },
    {
      "id": "sub-cs-b",
      "name": "Section B (Afternoon)",
      "parentId": "grp-cs101-section",
      "required": true,
      "childrenConflict": false,
      "conflictsWith": []
    },
    {
      "id": "grp-elective",
      "name": "Humanities Elective",
      "parentId": null,
      "required": false,
      "childrenConflict": false,
      "conflictsWith": []
    }
  ],
  "classes": [
    {
      "id": "cs101-lec",
      "name": "CS 101 Lecture",
      "type": "lecture",
      "groupId": null,
      "instructor": "Dr. Sarah Chen",
      "location": "Engineering Hall 101",
      "credits": 3,
      "attendAllSessions": true,
      "sessions": [
        { "day": "Sun", "start": "10:00", "end": "11:30" },
        { "day": "Wed", "start": "10:00", "end": "11:30" }
      ]
    },
    {
      "id": "cs101-lab-a",
      "name": "CS 101 Lab (Sec A)",
      "type": "lab",
      "groupId": "sub-cs-a",
      "instructor": "TA Rivera",
      "location": "CS Lab 204",
      "credits": 0,
      "attendAllSessions": false,
      "sessions": [
        { "day": "Mon", "start": "09:00", "end": "11:00" }
      ]
    },
    {
      "id": "cs101-lab-b",
      "name": "CS 101 Lab (Sec B)",
      "type": "lab",
      "groupId": "sub-cs-b",
      "instructor": "TA Patel",
      "location": "CS Lab 205",
      "credits": 0,
      "attendAllSessions": false,
      "sessions": [
        { "day": "Tue", "start": "14:00", "end": "16:00" }
      ]
    },
    {
      "id": "math201",
      "name": "Calculus II",
      "type": "lecture",
      "groupId": null,
      "instructor": "Prof. Williams",
      "location": "Math Building 301",
      "credits": 4,
      "attendAllSessions": false,
      "sessions": [
        { "day": "Sun", "start": "08:00", "end": "09:30" },
        { "day": "Mon", "start": "12:00", "end": "13:30" }
      ]
    },
    {
      "id": "phil101",
      "name": "Intro to Philosophy",
      "type": "lecture",
      "groupId": "grp-elective",
      "instructor": "Dr. Davis",
      "location": "Humanities 202",
      "credits": 3,
      "attendAllSessions": false,
      "sessions": [
        { "day": "Thu", "start": "11:00", "end": "13:00" }
      ]
    }
  ]
}
```

---

## 8. Validation Checklist

When authoring or exporting JSON schedules for the application, verify that:

- [x] `meta.dayStart` is strictly earlier than `meta.dayEnd`.
- [x] All session start and end times fall within `dayStart` and `dayEnd`.
- [x] All session times use 24-hour `"HH:MM"` format with 15-minute alignment (`:00`, `:15`, `:30`, `:45`).
- [x] All group and class IDs are unique strings across the file.
- [x] If `parentId` is specified on a group, it references an existing group ID in `groups`.
- [x] No cycles exist in group parent references (`A` cannot be an ancestor of `A`).
- [x] If `groupId` is provided on a class, it references an existing group ID in `groups`.
- [x] `day` in every session matches an entry in `meta.dayOrder`.
- [x] Classes requiring attendance at every session have `"attendAllSessions": true`.
- [x] Multi-session classes offering a choice between alternative time slots omit `attendAllSessions` or set it to `false`.
