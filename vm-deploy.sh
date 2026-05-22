#!/usr/bin/env bash
set -euo pipefail

# Usage: sudo ./vm-deploy.sh [repo-url] [branch]
REPO=${1:-"https://github.com/Mithila001/dad-tv-video-stream.git"}
BRANCH=${2:-"main"}
WORKDIR=/opt/dad-tv-video-stream

echo "Updating apt and installing prerequisites..."
apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release git

echo "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list >/dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

echo "Installing Docker Compose plugin..."
apt-get install -y docker-compose-plugin

echo "Cloning repository into ${WORKDIR}..."
rm -rf "$WORKDIR"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$WORKDIR"

cd "$WORKDIR"

echo "Starting application with Docker Compose..."
docker compose down || true
docker compose build --pull
docker compose up -d

echo "Deployment finished. Frontend: http://<VM_IP>/  Backend API: http://<VM_IP>:5000/api/"
