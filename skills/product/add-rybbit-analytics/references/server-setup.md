# Set up the Rybbit server

For a first server or a rebuild. This is for option (a), your own Linux VPS. Options (b) and (c) are at the end.

The user handles accounts, payment, passwords and tokens. The user types every secret in their own terminal or browser. Do not ask to see, store or repeat one. Ask before each step that changes the server.

## Choosing a server

Rybbit needs an always-on machine running Docker, with ClickHouse, Postgres and Redis. A serverless platform that sleeps or wipes its disk will not work. Any VPS provider works. A size that fits: 4 vCPU, 8 GB RAM and 75 GB disk, with Ubuntu LTS. Check live prices in a browser and prefer month-to-month billing so the user can leave. Examples of providers: Hetzner, DigitalOcean, Vultr, Linode.

## Local command forms

Commands the user runs on their own machine come in two forms. Server commands are bash and run over SSH.

- Generate a key (same in both shells): `ssh-keygen -t ed25519 -C "analytics-server"`
- Show the public key to paste into the provider: bash `cat ~/.ssh/id_ed25519.pub`, PowerShell `Get-Content $HOME\.ssh\id_ed25519.pub`
- Log in: `ssh USER@SERVER_ADDRESS`
- Run a remote command that needs a terminal: put the whole remote command in single quotes, for example `ssh -t USER@SERVER_ADDRESS 'sudo whoami'`. Single quotes stop PowerShell from expanding `~` and `$variables` on your own machine before the command is sent. `ssh USER@SERVER_ADDRESS 'echo $HOME'` prints the server's home folder, while the same command in double quotes would print yours. Bash and zsh behave the same way with single quotes.
- Copy a file to the server: `scp LOCAL_FILE USER@SERVER_ADDRESS:/tmp/`

Paths with spaces need quotes in every shell.

## Steps

1. **SSH key.** The user creates an ed25519 key and pastes the public key into the provider's key box when creating or reinstalling the server. Done when `ssh USER@SERVER_ADDRESS whoami` works without a password.
2. **First login.** Some providers force a password change at first login. If so, the user does it in their own terminal. Nothing runs until that is done.
3. **Harden.** Work in this order.

   1. **Create a non-root user with sudo and key login.** Skip this if the first login is already a non-root user with sudo. Many VPS images start as root. As root, in the user's own terminal: `adduser NEW_USER` (the user types the password), `usermod -aG sudo NEW_USER`, then copy the authorized keys: `rsync --archive --chown=NEW_USER:NEW_USER ~/.ssh /home/NEW_USER`.
   2. **Prove it in a second session.** Keep the first session open. In a new terminal, run `ssh NEW_USER@SERVER_ADDRESS` and check that it logs in with the key and no password prompt, then run `sudo whoami` and check that it prints `root`. Do not go on until both work.
   3. **Only then, lock SSH down.** Set password login off and root login off in `/etc/ssh/sshd_config.d/00-hardening.conf`. The first match wins, and a file named `99-...` loses to the cloud image's own files. Verify with `sudo sshd -T | grep -Ei 'passwordauthentication|permitrootlogin'`. Keep the first session open, open a third and log in as NEW_USER again, and only then close the others.
   4. **The rest, as NEW_USER:**
      - a firewall allowing only 22, 80 and 443: `sudo ufw default deny incoming`, `sudo ufw default allow outgoing`, `sudo ufw allow 22/tcp`, `sudo ufw allow 80/tcp`, `sudo ufw allow 443/tcp`, `sudo ufw --force enable`
      - `fail2ban` and `unattended-upgrades` from the package manager
      - 4 GB of swap: `sudo fallocate -l 4G /swapfile`, `sudo chmod 600 /swapfile`, `sudo mkswap /swapfile`, `sudo swapon /swapfile`, then add `/swapfile none swap sw 0 0` to `/etc/fstab`
      - Docker log limits, once Docker is installed (see below). If `/etc/docker/daemon.json` exists, read it and add `"log-driver": "json-file"` and `"log-opts": {"max-size": "10m", "max-file": "3"}` to it, keeping every other setting. Do not overwrite the file. If it does not exist, create it with just those two settings. Check that the result is valid JSON (for example with `jq . /etc/docker/daemon.json`). Restarting Docker restarts the containers that are running, so on a server that already runs anything, tell the user and ask first.

   Install Docker Engine and the compose plugin from Docker's official apt repository (docs.docker.com/engine/install). Docker publishes container ports around the firewall, so after the stack starts run `sudo ss -tlnp` and check that nothing listens on a public address except 22, 80 and 443.

   Reboot once all of this is done, and log in as NEW_USER again to confirm.
4. **DNS.** Find who hosts the zone from its nameservers (`nslookup -type=NS example.com` works on Windows, macOS and Linux). That can differ from the registrar. Add one A record for the analytics hostname, pointing at the server. Wait until it resolves.
5. **Install.** Clone a tagged release, not the main branch: `git clone --branch v2.9.2 --depth 1 https://github.com/rybbit-io/rybbit.git` (use the newest release tag; v2.9.2 is the version this skill was tested with). Set `IMAGE_TAG` to the same tag. Write `.env` by hand, because the repo's `setup.sh` leaves default passwords in place. Start from the repo's `.env.example` or the file `setup.sh` writes, and keep the variable names your tag uses. Then:
   - generate every password and secret on the server, for example `openssl rand -hex 24`, and write it straight into `.env` without printing it
   - `chmod 600 .env`
   - set `DISABLE_TELEMETRY=true`
   - never `cat` the file back into the chat

   Then run `docker compose --profile with-webserver pull` and `docker compose --profile with-webserver up -d --no-build`.
6. **Admin account.** As soon as HTTPS answers, the user signs up in their browser, because sign-up is open to anyone until locked. Set `DISABLE_SIGNUP=true` in `.env`, restart the stack, and prove it: the user tries to sign up a second account and it must fail.
7. **Replay limit.** Replay data grows fast. List the tables with `SHOW TABLES LIKE 'session_replay%'`. For each one, read `SHOW CREATE TABLE` to find its timestamp column, then run `ALTER TABLE ... MODIFY TTL <timestamp column> + INTERVAL 14 DAY`. 14 days is an example; the user picks. Write the number into the privacy policy. Recheck the TTL after every upgrade.
8. **Backups.** The user creates a bucket at an S3-compatible provider (examples: Backblaze B2, Cloudflare R2, Wasabi, AWS S3) and a token that can write to that bucket only. Install `rclone` from rclone.org, not from the distribution package: an old Ubuntu build failed with `501 NotImplemented` against an S3-compatible bucket. The user runs `rclone config` themselves over `ssh -t` and types the keys there. Then, with the user's approval, write a nightly job on the server that dumps Postgres and the ClickHouse `events` and `bot_events` tables, uploads them, and deletes copies older than 14 days.

   What this backup covers: Postgres (accounts, sites and settings) and the ClickHouse `events` and `bot_events` data. The session replay tables are not backed up. They expire after the retention period, so after a rebuild the counts come back and the recorded sessions do not. Run `SHOW TABLES` in ClickHouse and tell the user about every other table the job leaves out. The `.env` file is not covered either. It holds secrets, so the user keeps their own copy.

   Encrypt the backups before they leave the server. This is recommended, because the dumps hold visitor data and account records. Use an rclone `crypt` remote on top of the bucket, or the storage provider's own encryption. With rclone crypt the user types the crypt password in `rclone config` themselves and keeps it safe: without it the backups cannot be read.
9. **Prove a restore.** Restore the Postgres dump into a scratch database, and `events` into a scratch table (`CREATE TABLE ... AS`). Done when the row count and a checksum over two or three columns (use `DESCRIBE TABLE` to pick them) match live data. Delete the scratch objects afterwards. This proves Postgres and `events` only. It does not prove a full rebuild, because the replay tables and anything else left out of the backup were not tested. Say so to the user.
10. **Alerts.** Create a check at an uptime or heartbeat service (examples: Healthchecks.io, Uptime Kuma, Better Stack) with a 5 minute period and 15 minute grace. The user pastes the ping URL into a file on the server themselves; treat it as a secret. A cron job runs every 5 minutes and pings only when all of these hold: disk use below 75%, every container healthy, the site answers over HTTPS, and the newest backup is under 26 hours old. Force one failure and have the user confirm the alert email arrived.

## Shell gotchas

- An agent's shell tool has no usable password prompt. Logins that need a password belong in the user's own terminal.
- Over `ssh host 'bash -s'`, child commands can swallow the rest of the script from standard input, and it stops silently. Copy a script over with `scp`, or add `</dev/null` to the commands.
- A background loop around `ssh-keygen -R` hides real login errors. Test SSH once and read the message.
- After any Rybbit upgrade, recheck the replay TTL and the sign-up lock.

## Options (b) and (c)

**(b) A one-click host such as Railway.** Follow the host's own Rybbit setup. Then apply what you can of steps 5 to 10: pin a release, create the admin account right away and lock sign-up, set `DISABLE_TELEMETRY`, set the replay TTL on the ClickHouse tables, and use the host's backup and alert tools. Check what the host really provides before you promise the user a backup.

**(c) Rybbit Cloud.** Sign up, add the site, and use `https://app.rybbit.io/api` as `apiUrl`. Skip everything above. You cannot query the database, so verify privacy by watching the replay in the dashboard. Replay retention and where data is stored are the provider's terms: read them, and name the provider in the privacy policy.
