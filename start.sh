#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e
# Enable print trace for real-time unbuffered debugging
set -x

echo "=== Tomoio System Startup ==="

# Validate Environment Variables
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set. Please set it in Hugging Face Secrets."
    exit 1
fi

# Fallback DIRECT_URL if not set (needed for Prisma schema validation/migrations)
if [ -z "$DIRECT_URL" ]; then
    if [[ "$DATABASE_URL" == *"-pooler."* ]]; then
        echo "DIRECT_URL is not set. Deriving Neon direct URL from DATABASE_URL."
        export DIRECT_URL="${DATABASE_URL/-pooler/}"
    else
        echo "DIRECT_URL is not set. Using DATABASE_URL as fallback."
        export DIRECT_URL="$DATABASE_URL"
    fi
fi

# Neon pooler can time out Prisma advisory locks during Space restarts.
export PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1

# Fallback JWT_SECRET if not set to prevent login crashes
if [ -z "$JWT_SECRET" ]; then
    echo "JWT_SECRET is not set. Using default fallback secret."
    export JWT_SECRET="tomoio-default-secret-key-change-me-in-production"
fi

# 1. Run Prisma Migration
echo "Applying Prisma migrations to the Neon.tech database..."
cd /app/backend
MIGRATE_OK=0
for attempt in 1 2 3; do
    if ./node_modules/.bin/prisma migrate deploy; then
        MIGRATE_OK=1
        break
    fi
    echo "Prisma migrate deploy failed on attempt $attempt. Retrying in 5 seconds..."
    sleep 5
done

if [ "$MIGRATE_OK" -ne 1 ]; then
    echo "WARNING: Prisma migrate deploy failed after retries. Continuing startup with existing schema."
fi

# 2. Auto-approve records that previously depended on an admin UI
echo "Auto-approving records that require admin review..."
node -e "
const { PrismaClient, UserStatus, KycStatus, EventStatus, ReportCaseStatus } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const [users, kyc, events, reports] = await prisma.\$transaction([
    prisma.verifiedUser.updateMany({
      where: { status: UserStatus.PENDING },
      data: { status: UserStatus.VERIFIED },
    }),
    prisma.kycRequest.updateMany({
      where: { status: KycStatus.PENDING },
      data: { status: KycStatus.APPROVED },
    }),
    prisma.event.updateMany({
      where: { status: EventStatus.PENDING },
      data: { status: EventStatus.APPROVED },
    }),
    prisma.reportCase.updateMany({
      where: { status: ReportCaseStatus.PENDING },
      data: { status: ReportCaseStatus.APPROVED },
    }),
  ]);
  console.log(JSON.stringify({
    verifiedUsers: users.count,
    kycRequests: kyc.count,
    events: events.count,
    reportCases: reports.count,
  }));
}
main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
"

# 3. Check if database is empty and auto-seed if needed
echo "Checking database user count..."
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.verifiedUser.count()
  .then(count => {
    console.log(count);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
")

if [ "$USER_COUNT" -eq 0 ]; then
    echo "Database is empty. Initializing seed data..."
    npm run seed
else
    echo "Database has $USER_COUNT users. Skipping seed."
fi

# 4. Start Backend in the background
echo "Starting Express + WebSockets backend on port 5001..."
PORT=5001 node src/server.js &
BACKEND_PID=$!

# 5. Start Next.js Frontend in the background
echo "Starting Next.js frontend on port 3000..."
cd /app/frontend
npm run start -- -p 3000 &
FRONTEND_PID=$!

# Handle exit signals to terminate background processes cleanly
cleanup() {
    echo "Terminating background processes..."
    kill $BACKEND_PID || true
    kill $FRONTEND_PID || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# 6. Start Nginx in the foreground on port 7860
echo "Starting Nginx reverse proxy on port 7860..."
nginx -c /app/nginx.conf -g "daemon off;"
