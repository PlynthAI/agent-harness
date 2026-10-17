# Video transcripts

yt-dlp reads a video's captions without downloading the video. Check that it is
present:

```bash
yt-dlp --version
```

If it is missing, say so, leave the inbox note in `Inbox/` with its URL, and
offer to install it with `uv tool install yt-dlp`. Install only when the person
agrees.

Fetch the captions and the metadata into the brain's raw intake:

```bash
yt-dlp --skip-download --write-subs --write-auto-subs --sub-langs "en.*" --sub-format vtt --write-info-json -o "<brain root>/Inbox/.raw/video/%(id)s.%(ext)s" "<video URL>"
```

Take the title, channel and upload date from the `.info.json` file, and read the
`.vtt` file as the transcript, ignoring its timing lines. Prefer the uploader's
captions to automatic ones when both arrive. Record the video URL as the
source `resource`.

When the site asks the request to sign in or prove it is not a bot, stop. Do not
pass browser cookies or retry through another client; ask the person to paste
the transcript, or read the transcript panel in the signed-in browser pane.
