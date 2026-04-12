---
description: Export the current conversation transcript to a Markdown file
---

This workflow exports the transcript of your current AI session to a dedicated folder in your project.

1. Create a `transcripts` directory in the project root if it doesn't exist.
// turbo
2. Run the export script to generate the transcript file.
`powershell -ExecutionPolicy Bypass -File .\export_transcript.ps1`

3. The transcript will be saved in `.\transcripts\transcript_[ID].md`.