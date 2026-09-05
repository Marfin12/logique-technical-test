# Operations runbook

This runbook covers the local/trusted-network HTTP deployment profile. It is not approval to expose the application to the public internet.

## Health and metrics

- Public web health: `curl --fail http://127.0.0.1/health/api`
- Container state: `docker compose ps -a`
- Backend logs: `docker compose logs --since=15m api`
- Frontend logs: `docker compose logs --since=15m web`
- Internal aggregate metrics: `docker compose exec -T api wget -qO- http://127.0.0.1:4000/internal/metrics`

Suggested initial alerts for a single demo instance:

- API unavailable or `/ready` failing for two consecutive minutes;
- any increase in `apiErrors`, `ratingFailures`, or `submissionFailures` during an acceptance run;
- draft-save failure ratio above 5% over 15 minutes;
- repeated `adminTransitionConflicts`, which may indicate concurrent reviewer activity;
- MongoDB container unhealthy, persistent volume near 80%, or backup failure.

Counters are process-local and reset on API restart. Production monitoring must scrape and retain them externally.

## Backup

Create an encrypted, access-controlled destination outside the repository. For a local verification archive:

```sh
mkdir -p backups
docker compose exec -T mongo mongodump --quiet --archive --gzip --db insurance > backups/insurance-$(date -u +%Y%m%dT%H%M%SZ).archive.gz
```

Do not commit backups. Treat them as sensitive because they can contain profiles, applications, and password hashes. Encrypt them at rest, restrict access, record successful completion, and keep them outside the application host for real deployments.

Provisional demo targets, pending owner approval: daily backup, 24-hour recovery point, four-hour recovery time, and 30-day backup retention. Application-record retention/deletion is a business and regulatory decision; no automatic application purge is enabled.

## Restore verification

Restore into an isolated database first; never overwrite the active database during a test:

```sh
docker compose exec -T mongo mongorestore --quiet --archive --gzip --drop --nsFrom='insurance.*' --nsTo='insurance_restore_verify.*' < backups/insurance-YYYYMMDDTHHMMSSZ.archive.gz
docker compose exec -T mongo mongosh --quiet insurance_restore_verify --eval 'db.getCollectionNames().sort()'
```

Verify collection counts, validators, indexes, fixture login, and a read-only application walkthrough. Drop the isolated verification database only after recording the result:

```sh
docker compose exec -T mongo mongosh --quiet insurance_restore_verify --eval 'db.dropDatabase()'
```

## Rollback

1. Stop new mutations by restricting access at the host firewall or stopping `web`.
2. Preserve logs and take a pre-rollback backup.
3. Redeploy the previously approved immutable image tags. Do not roll back MongoDB structure blindly.
4. If a database rollback is required, restore into an isolated database, verify it, then perform a separately approved cutover.
5. Run health, user, admin, lifecycle, and index verification before reopening access.

## Ownership and limitations

Until named owners are assigned, the repository operator owns service health, backup execution, restore tests, dependency/security updates, and incident response. Product/business owners must approve insurance values and policy content. Known limitations are tracked in `docs/PHASE_8_RELEASE.md`.
