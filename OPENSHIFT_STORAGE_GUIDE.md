# OpenShift Storage Guide for Dad TV Video Stream

This guide explains which storage options to choose when creating persistent volume claims for this application in Red Hat OpenShift.

## What this app needs

The backend writes uploaded videos and generated thumbnails to disk, and the frontend serves those files back through Nginx. In this repository, the Docker Compose setup mounts shared video and thumbnail data into both containers, so the storage should behave like a normal shared filesystem, not a raw block device.

Relevant paths in the repo:

- [docker-compose.yml](docker-compose.yml)
- [backend/src/server.ts](backend/src/server.ts)
- [frontend/nginx.conf](frontend/nginx.conf)

## Recommended choice

If you are deploying this as a normal containerized app, the shared media volume should use:

- **Storage class:** `hpe-standard-file`
- **Volume mode:** `Filesystem`
- **Access mode:** `RWX` (ReadWriteMany / shared access)

If you are deploying an OpenShift Virtualization VM, do **not** use that same combination for the VM boot disk. A VM boot disk should normally be a separate block-backed volume with single-writer access.

## VM-specific recommendation

Yes, you can create two volumes for the same VM, and that is usually the better design.

Use:

- one **boot volume** for the operating system
- one **data volume** for application files, uploads, or persistent data

For the VM boot volume, prefer:

- **Storage class:** `hpe-standard-block` or another block-capable class
- **Volume mode:** `Block`
- **Access mode:** `RWO` (ReadWriteOnce / single user)

That avoids the performance and corruption risks OpenShift is warning about.

For the data volume, choose based on how the VM uses it:

- If only that VM needs the data, use `Filesystem` + `RWO`.
- If multiple workloads must read and write the same data, use `Filesystem` + `RWX`, but only for the shared data volume, not the boot disk.

### Storage class: `hpe-standard-file`

Choose the file-based storage class when you want a mounted directory that behaves like a normal Linux filesystem.

Use this for:

- uploaded video files
- generated thumbnails
- registry or library JSON files

This matches the app design because the backend reads and writes files directly, and Nginx serves them from the same mounted storage.

### Volume mode: `Filesystem`

Use `Filesystem` when the application expects to read and write regular files in directories.

This app does not need raw block access. It needs paths like:

- `/videos`
- `/thumbnails`

So `Filesystem` is the correct choice.

### Access mode: `RWX`

Use `RWX` when more than one workload may need to mount the same volume at the same time.

That is the best match for shared application data because:

- the backend writes the files
- the frontend/Nginx serves the same files
- shared access avoids mount conflicts and copy steps

If OpenShift says RWX is highly recommended, that warning is usually about shared application data, not about a VM boot disk. Do not use RWX for the boot disk.

## What not to choose by default

### `hpe-standard-block`

Choose this only if you have a specific reason to manage a raw block device yourself.

For this app it is not the best default because the application expects mounted directories, not raw disk handling.

### `localblock-sc`

Avoid this for the main app storage unless you explicitly want node-local storage and understand the operational tradeoffs.

Reasons:

- it is node-bound
- it is less flexible for rescheduling
- it is usually worse for shared app data
- it is not ideal for media that should survive pod movement cleanly

### `RWO` only

Use `RWO` only if exactly one pod will ever mount the volume at a time.

That is usually too restrictive for this app because the backend and frontend need to share the same stored media.

### `ROX`

Use `ROX` only for read-only content.

This is not suitable for uploads because the backend must write new files and thumbnails.

## Practical recommendation for this app

If you want the simplest working setup for containerized deployment, use one shared PVC for media storage with:

- `hpe-standard-file`
- `Filesystem`
- `RWX`

If you want to run the app inside a VM on OpenShift Virtualization, use two volumes instead:

- boot disk: `Block` + `RWO`
- data disk: `Filesystem` + `RWO`

Use `RWX` only if the data volume must be shared by more than one workload.

## If RWX is not available

If your cluster cannot provide RWX on the chosen storage class, then the safer fallback is to redesign storage so only one workload writes the files and other workloads read from object storage or a shared file service.

For this repository, RWX is the right first choice.

## Short answer

For a containerized app, choose **`hpe-standard-file` + `Filesystem` + `RWX`**.

For an OpenShift VM, use **two volumes**:

- boot disk: **`Block` + `RWO`**
- data disk: **`Filesystem` + `RWO`** unless the data truly must be shared

That is the safest match for a VM boot disk plus separate persistent application data.

## Data size recommendation

If the system will only store around 5 GB of videos, do not size the volume at exactly 5 GB.

Use a larger volume to cover:

- uploaded video growth
- thumbnail files
- filesystem metadata
- logs and temporary processing files
- future cleanup delay

Recommended sizing:

- **Data volume:** 15 GB minimum
- **Better practical size:** 20 GB to 30 GB
- **Boot disk:** 30 GB to 50 GB is usually enough for a small VM

If you expect the video library to stay close to 5 GB total, 20 GB for the data disk is a comfortable starting point.

If you expect more uploads later, choose 30 GB so you do not have to resize immediately.