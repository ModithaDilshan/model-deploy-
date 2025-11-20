# Godot Game Builder

A scalable pipeline for generating customised **Godot** game builds. Users upload character models through the Vercel-hosted web UI, the files are stored in S3, jobs are queued in SQS/DynamoDB, dedicated Windows workers swap the asset into the included Godot project, export Windows or Web builds via the Godot CLI, and upload the finished artifacts back to S3 for download.

## High-level architecture

```
Browser → Vercel frontend → API endpoints
                      │
                      ├── Get presigned upload URL (S3 uploads bucket)
                      ├── Queue job (SQS + DynamoDB status)
                      └── Poll job status / download build

Dedicated build worker(s)
  ├── Poll SQS for jobs
  ├── Download & convert uploaded model (OBJ ➜ glb)
  ├── Copy model into Godot project + force re-import
  ├── Run Godot CLI export (Windows or Web)
  └── Upload build to S3 + update job status
```

## Prerequisites

- Node.js 18+ and npm
- AWS account with permissions for S3, SQS, DynamoDB
- Windows build server(s) with **Godot 4.3+** (editor + export templates)
- Git + permission to pull this repository

## Install dependencies

```bash
npm install
```

## Configuration (`config.js` or environment variables)

| Key | Description |
| --- | --- |
| `GODOT_PROJECT_PATH` | Absolute path to the checked-out Godot project on the worker |
| `GODOT_EDITOR_PATH` | Path to the Godot executable (CLI capable) |
| `GODOT_IMPORTED_MODEL_PATH` | Path inside the project where the uploaded model should be copied (e.g. `Imported/user_model.glb`) |
| `GODOT_EXPORT_PRESET_WIN` | Name of the Windows export preset defined in `export_presets.cfg` |
| `GODOT_EXPORT_PRESET_WEB` | Name of the Web export preset |
| `GODOT_WINDOWS_OUTPUT_NAME` | Filename to produce for Windows exports (default `MyGame.exe`) |
| `GODOT_WEB_OUTPUT_NAME` | Entry file name for Web exports (default `index.html`) |
| `SUPPORTED_MODEL_FORMATS` | Comma-separated list of accepted uploads (`glb,obj`) |
| `AWS_REGION` | AWS region for all SDK calls |
| `UPLOADS_BUCKET` | S3 bucket receiving uploaded models |
| `BUILDS_BUCKET` | S3 bucket storing completed builds |
| `JOBS_TABLE_NAME` | DynamoDB table storing job metadata |
| `JOBS_QUEUE_URL` | SQS queue URL for build jobs |
| `UPLOAD_URL_TTL` | Seconds that presigned upload URLs remain valid (default 900) |
| `DOWNLOAD_URL_TTL` | Seconds that presigned download URLs remain valid (default 900) |
| `WORKER_POLL_INTERVAL` | Milliseconds between SQS polls (default 5000) |
| `WORKER_MAX_CONCURRENT_JOBS` | Number of SQS messages to process per poll (default 1) |

Create a `.env` file with the values above for local development. Deployments (Vercel, build servers) should set the same variables via their configuration systems.

## API endpoints

### `POST /api/upload-url`
Request a presigned URL that lets the browser upload directly to S3.

Input body:
```json
{ "fileName": "Character.glb", "fileType": "application/octet-stream" }
```

Response:
```json
{ "success": true, "uploadUrl": "https://...", "assetKey": "uploads/uuid-file.glb" }
```

### `POST /api/jobs`
Queue a new build job once an asset is stored in S3.

```json
{ "assetKey": "uploads/uuid-file.glb", "originalFileName": "Character.glb", "buildType": "exe" }
```

Returns the job metadata (`jobId`, `status` = `queued`, timestamps, etc.).

### `GET /api/jobs?jobId=...`
Retrieve the latest job information (status can be `queued`, `processing`, `completed`, `failed`).

### `GET /api/jobs/download?jobId=...`
For completed jobs, returns a presigned S3 URL to download the generated build.

## Frontend workflow (`public/script.js`)

1. User selects a `.glb` or `.obj` file (max 100 MB).
2. Browser requests `/api/upload-url`, then uploads the file directly to S3 using the returned URL.
3. Browser calls `/api/jobs` with the S3 key to queue a build.
4. UI polls `/api/jobs/:jobId` until the worker finishes.
5. When ready, `/api/jobs/:jobId/download` returns the presigned link used for the download button.

## Build worker (`worker/index.js`)

Run on a Windows machine that has Godot installed:

```bash
npm run worker
```

Responsibilities:

- Poll SQS for jobs and mark progress in DynamoDB.
- Download the uploaded asset from the uploads bucket.
- Convert `.obj` uploads to `.glb` via `obj2gltf` and copy the result into the Godot project (`res://Imported/user_model.glb`), forcing a re-import.
- Run the Godot CLI exports (Windows preset for `.exe`, Web preset for HTML/wasm).
- Zip the Web export, upload finished artifacts to the builds bucket, and update the job status.

## Sample Godot project (included)

Located at `new-game-project/`:

- `scenes/Main.tscn` – scene with light, rotating camera pivot, and placeholder mesh.
- `scripts/ModelLoader.gd` – loads `res://Imported/user_model.glb` if present, otherwise shows the fallback cube.
- `export_presets.cfg` – defines `Windows Desktop` and `Web` presets used by the worker.
- `Imported/` – target directory for the uploaded model (the worker copies the converted asset here each job).

You can test the pipeline with `sample_models/SampleCharacter.obj`. The worker converts it to `.glb`, imports it into Godot, and runs both export presets automatically.

## Manual deployment guide

### 1. Prepare AWS resources

1. Create two S3 buckets (or one bucket with separate prefixes): `unity-builder-uploads`, `unity-builder-builds`.
2. Create a DynamoDB table `unity_build_jobs` with primary key `jobId` (string).
3. Create an SQS queue `unity-build-jobs` with a suitable visibility timeout (> build duration).
4. Configure IAM roles/policies:
   - **Web/API role:** permission to create presigned URLs, read/write DynamoDB, send messages to SQS.
   - **Worker role:** permission to read uploads bucket, write builds bucket, update DynamoDB, receive/delete SQS messages.

### 2. Deploy the web app (Vercel)

1. Push this repository to GitHub/GitLab.
2. Import the project into Vercel.
3. Set environment variables in Vercel matching the table above.
4. Deploy – Vercel hosts the static frontend and the Express API (via serverless adapters or self-hosted Node if preferred).

### 3. Provision the build worker server

1. Provision a Windows machine (EC2, bare metal, etc.) with sufficient CPU/RAM.
2. Install **Godot 4.3+** via the official installer (ensure the executable supports `--headless` CLI use).
3. In Godot, download and install the Windows + Web export templates.
4. Install Node.js 18+.
5. Pull this repository onto the server and run `npm install`.
6. Set the `.env` values for AWS + Godot paths (`GODOT_EDITOR_PATH`, `GODOT_PROJECT_PATH`, etc.).
7. Run `npm run worker` (use a Windows service or Task Scheduler to keep it running).

### 4. Validate end-to-end flow

1. Open the deployed Vercel site.
2. Upload `sample_models/SampleCharacter.obj` → file stored in the uploads bucket.
3. Confirm a job record appears in DynamoDB with status `queued`.
4. Worker picks up the job, converts/imports the model into the Godot project, runs the requested export, and uploads the artifact to the `builds/` prefix.
5. Job status becomes `completed`; the download button returns a presigned URL.
6. Download the `.exe` or `.zip` (Web) and verify the imported model in the running build.

### 5. Operations checklist

- Monitor CloudWatch logs for worker success/failure.
- Track queue depth to scale worker instances if required.
- Rotate S3/DynamoDB credentials according to security policy.
- Implement retention/cleanup for old uploads and builds.

## Troubleshooting

- **Job stuck in queued:** worker not running or lacks SQS/DynamoDB permissions.
- **Job fails immediately:** verify `GODOT_EDITOR_PATH` and `GODOT_PROJECT_PATH`, ensure export templates are installed, and confirm the uploaded asset is a supported format (`glb` or `obj`).
- **OBJ uploads fail to convert:** `obj2gltf` requires manifold geometry; try exporting the model as `.glb` directly from your DCC package.
- **Download link fails:** ensure the builds bucket policy allows the worker role to upload and that `DOWNLOAD_URL_TTL` is long enough for the client to fetch the file.

## License

ISC

