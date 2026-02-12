Below is a **clean, professional README.md version** suitable for production or thesis documentation.

---

# Jennah UI

## Overview

**Jennah UI** is a React-based cloud workload management dashboard designed to interact with the Project Jennah distributed backend system.
It provides a user-friendly interface for submitting compute jobs, monitoring job execution status, and managing tenant workloads through a secure, authenticated web interface deployed on Google Cloud Run.

This repository contains:

* Frontend application source code
* API client integrations
* Containerization configurations
* Cloud Run deployment manifests
* Authentication proxy configuration

---

## Technology Stack

* **Framework:** React + TypeScript (Vite)
* **API Transport:** ConnectRPC (`@connectrpc/connect-web`)
* **Protobuf Clients:** Buf + `@bufbuild/protobuf`
* **Containerization:** Docker (Multi-stage build)
* **Web Server:** Nginx (SPA routing)
* **Deployment:** Google Cloud Run
* **Authentication:** oauth2-proxy with GitHub OAuth

---

## System Architecture Role

Jennah UI acts as the **presentation layer** of the distributed system:

```
User → Jennah UI → Gateway API → Worker Nodes → Cloud Batch → Cloud Spanner
```

The UI communicates with the backend Gateway through ConnectRPC endpoints exposed under `/api`.

---

## Features

* Job submission interface
* Job status monitoring dashboard
* Secure GitHub OAuth authentication
* Containerized deployment pipeline
* Cloud Run serverless hosting
* Environment-based configuration management

---

## Project Structure

```
jennah-ui/
│
├── src/                # Application source code
├── public/             # Static assets
├── nginx.conf          # Nginx SPA routing configuration
├── Dockerfile          # Multi-stage container build
├── service.yaml        # Cloud Run deployment manifest
└── README.md
```

---

## Development Setup

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

### Build production assets

```bash
npm run build
```

---

## Containerization

The application uses a **multi-stage Docker build**:

* Stage 1: Node.js build environment
* Stage 2: Nginx production runtime

Build the container:

```bash
docker build -t jennah-ui .
```

---

## Deployment to Cloud Run

### Push container to Artifact Registry

```bash
docker tag jennah-ui REGION-docker.pkg.dev/PROJECT_ID/jennah/jennah-ui:latest
docker push REGION-docker.pkg.dev/PROJECT_ID/jennah/jennah-ui:latest
```

### Deploy service

```bash
gcloud run deploy jennah-ui \
  --image REGION-docker.pkg.dev/PROJECT_ID/jennah/jennah-ui:latest \
  --region REGION
```

---

## Authentication Flow

The application uses **oauth2-proxy** deployed as a **sidecar container**:

1. Incoming requests reach oauth2-proxy (port 4180)
2. Proxy validates session cookies or redirects users to GitHub OAuth
3. Authenticated traffic is forwarded internally to the UI container (port 8080)

Callback URL must be configured as:

```
[SERVICE_URL]/oauth2/callback
```

---

## Environment Configuration

Sensitive values are injected using environment substitution:

```bash
set -a; source .env.development; set +a
envsubst < service.yaml > service.resolved.yaml
```

Deploy resolved manifest:

```bash
gcloud run services replace service.resolved.yaml --region REGION
```

`service.resolved.yaml` must **never** be committed to version control.

---

## Security Notes

* HTTPS-only cookies enforced (`--cookie-secure`)
* Secrets managed via environment variables
* OAuth credentials stored outside repository
* Deployment manifests sanitized before commit

---

## Maintenance

* Rebuild and redeploy container after UI updates
* Rotate OAuth secrets when credentials change
* Update Cloud Run manifest when environment variables change
* Monitor logs via Google Cloud Logging

---

## Contributors

Project Jennah Development Team
Frontend UI Module

---

If you want, I can next create a **matching README template for the Gateway, Worker, and Infrastructure repositories**, so your whole project documentation looks **uniform and professional** (very useful for thesis submission).
