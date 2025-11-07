# Unity Game Builder

A scalable pipeline for generating customised Unity game builds. Users upload character models via the web UI, the files are stored in S3, jobs are queued for dedicated build workers, Unity builds run on Windows servers, and finished executables are delivered back through S3.

## High-level architecture

```
Browser → Vercel frontend → API endpoints
                      │
                      ├── Get presigned upload URL (S3 uploads bucket)
                      ├── Queue job (SQS + DynamoDB status)
                      └── Poll job status / download build

Dedicated build worker(s)
  ├── Poll SQS for jobs
  ├── Download model from S3
  ├── Replace placeholder in Unity project
  ├── Run Unity CLI build
  └── Upload .exe back to S3 + update status
```

## Prerequisites

- Node.js 18+ and npm
- AWS account with permissions for S3, SQS, DynamoDB
- Windows build server(s) with Unity Editor installed
- Unity project configured with `BuildScript.BuildGame`

## Install dependencies

```bash
npm install
```

## Configuration (`config.js` or environment variables)

| Key | Description |
| --- | --- |
| `UNITY_PROJECT_PATH` | Absolute path to the Unity project on the build worker |
| `UNITY_EDITOR_PATH` | Path to Unity Editor executable |
| `MODEL_TARGET_BASE` | Relative path (without extension) where uploaded models should be copied |
| `BUILD_OUTPUT_PATH` | Relative path to the generated executable in the Unity project |
| `BUILD_METHOD` | Fully-qualified build method executed by Unity |
| `AWS_REGION` | AWS region for all SDK calls |
| `UPLOADS_BUCKET` | S3 bucket receiving uploaded models |
| `BUILDS_BUCKET` | S3 bucket used to store completed builds |
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
{ "fileName": "Character.fbx", "fileType": "application/octet-stream" }
```

Response:
```json
{ "success": true, "uploadUrl": "https://...", "assetKey": "uploads/uuid-file.fbx" }
```

### `POST /api/jobs`
Queue a new build job once an asset is stored in S3.

```json
{ "assetKey": "uploads/uuid-file.fbx", "originalFileName": "Character.fbx" }
```

Returns the job metadata (`jobId`, `status` = `queued`, timestamps, etc.).

### `GET /api/jobs/:jobId`
Retrieve the latest job information (status can be `queued`, `processing`, `completed`, `failed`).

### `GET /api/jobs/:jobId/download`
For completed jobs, returns a presigned S3 URL to download the generated executable.

## Frontend workflow (`public/script.js`)

1. User selects a `.fbx` or `.obj` file (max 100 MB).
2. Browser requests `/api/upload-url`, then uploads the file directly to S3 using the returned URL.
3. Browser calls `/api/jobs` with the S3 key to queue a build.
4. UI polls `/api/jobs/:jobId` until the worker finishes.
5. When ready, `/api/jobs/:jobId/download` returns the presigned link used for the download button.

## Build worker (`worker/index.js`)

Run on a Windows machine with Unity installed:

```bash
npm run worker
```

Responsibilities:

- Poll the SQS queue for jobs.
- Download uploaded assets from the uploads bucket.
- Copy the asset into the Unity project (`MODEL_TARGET_BASE` + extension).
- Run Unity in batch mode using the configured method.
- Upload the resulting executable to the builds bucket.
- Update job status in DynamoDB.

## Sample Unity project (included)

Located at `My project (1)`:

- `Assets/Resources/Character/Character.obj` – placeholder model swapped during builds.
- `Assets/Scripts/CharacterLoader.cs` – loads the Resources model at runtime.
- `Assets/Scenes/SampleScene.unity` – contains a `CharacterRoot` with the loader attached.
- `Assets/Editor/BuildScript.cs` – exposes `BuildScript.BuildGame`, which the worker invokes.

Use `sample_models/SampleCharacter.obj` to test the pipeline locally.

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
2. Install Unity (matching the version used to author the project).
3. Install Node.js.
4. Pull this repository onto the server and run `npm install`.
5. Copy the Unity project (`My project (1)`) to `UNITY_PROJECT_PATH`.
6. Create a `.env` containing the same AWS configuration plus Unity paths.
7. Run `npm run worker` (use a Windows service or Task Scheduler to keep it running).

### 4. Validate end-to-end flow

1. Open the deployed Vercel site.
2. Upload `sample_models/SampleCharacter.obj` → file stored in uploads bucket.
3. Confirm a job record appears in DynamoDB with status `queued`.
4. Worker picks up the job, runs Unity, uploads build to `builds/` prefix.
5. Job status becomes `completed`; the download button returns a presigned URL.
6. Download `MyGame.exe` and run locally to verify the new character model.

### 5. Operations checklist

- Monitor CloudWatch logs for worker success/failure.
- Track queue depth to scale worker instances if required.
- Rotate S3/DynamoDB credentials according to security policy.
- Implement retention/cleanup for old uploads and builds.

## Troubleshooting

- **Job stuck in queued:** worker not running or lacks SQS/DynamoDB permissions.
- **Job fails immediately:** check Unity paths, asset compatibility, build logs (`BuildWorker.log`).
- **Download link fails:** ensure builds bucket permissions and `DOWNLOAD_URL_TTL` values are correct.

## License

ISC

