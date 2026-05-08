param(
  [string]$TaskName = "TechDigestStartup",
  [string]$ProjectPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$action = New-ScheduledTaskAction -Execute $npm -Argument "run start" -WorkingDirectory $ProjectPath
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Run the local Tech Digest dashboard. The app cron generates the digest every day at 08:30 by default." -Force

Write-Host "Registered startup task '$TaskName'."
