#requires -Version 7.5
$ErrorActionPreference='Stop'
# Isolated transport stub: no Cloudflare access or actual applicant reads.
function npx {
 $global:LASTEXITCODE=0
 '[{"success":true,"results":[{"id":"11111111-2222-4333-8444-555555555553","name":"CSV fixture","email":"fixture@example.com","purpose":"","message":"  =1+1","created_at":"2026-11-21T12:00:00.000Z","expires_at":"2027-11-21T12:00:00.000Z","mode":"preview","notification":"pending"}]}]'
}
$out=& "$PSScriptRoot/../../tools/beta-cloud.ps1" -Action csv -Id 11111111-2222-4333-8444-555555555553
$file=($out | Where-Object {$_ -like 'Saved *'}) -replace '^Saved \d+ records: ',''
$row=Import-Csv -LiteralPath $file
if($row.created_at -cne '2026-11-21T12:00:00.000Z'){throw 'Timestamp altered'}
if($row.message -cne "'  =1+1"){throw 'Formula not neutralized'}
if($row.id -cne '11111111-2222-4333-8444-555555555553'){throw 'Wrong record'}
Write-Output 'PASS: CSV formula guard and exact UTC timestamp preserved; no remote data accessed.'
