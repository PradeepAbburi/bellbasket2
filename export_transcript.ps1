param (
    [string]$ConversationId = "c78344e0-099e-4cde-a547-60ab7abfbbec",
    [string]$ExportPath = ".\transcripts"
)

# Define paths
$appDataDir = "C:\Users\dines\.gemini\antigravity"
$brainDir = Join-Path $appDataDir "brain"
$sessionDir = Join-Path $brainDir $ConversationId
$logPath = Join-Path $sessionDir ".system_generated\logs\overview.txt"

# Ensure export directory exists
if (-not (Test-Path $ExportPath)) {
    New-Item -ItemType Directory -Path $ExportPath -Force | Out-Null
}

$outputFile = Join-Path $ExportPath ("transcript_" + $ConversationId + ".md")

# Since the overview.txt might be locked or hidden in the live session,
# we would typically wait for completion or use an AI internal trigger.
# For this demonstration, we assume we want to read it if it exists.

if (Test-Path $logPath) {
    $content = Get-Content $logPath
    $markdown = "# Conversation Transcript: $ConversationId `n`n"
    $markdown += $content
    $markdown | Out-File -FilePath $outputFile -Encoding utf8
    Write-Host "Export successful: $outputFile"
} else {
    Write-Host "Log not found for $ConversationId at $logPath."
    Write-Host "Please note: Live logs for the current session may not be persisted yet."
}
