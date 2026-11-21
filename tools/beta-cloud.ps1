#requires -Version 7.5
param(
 [ValidateSet('stats','list','health','csv','delete')][string]$Action='health',
 [string]$Id,
 [switch]$Apply
)
$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:WRANGLER_SEND_METRICS='false'
if($Id -and $Id -notmatch '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'){throw 'Valid application UUID required.'}
$query=switch($Action){
 'stats' {'SELECT * FROM beta_metrics ORDER BY day DESC LIMIT 90'}
 'health' {"SELECT * FROM beta_maintenance; SELECT notification,COUNT(*) AS records FROM beta_applicants GROUP BY notification"}
 'list' {'SELECT id,name,email,created_at,expires_at,mode,notification FROM beta_applicants ORDER BY created_at DESC LIMIT 100'}
 'csv' {if($Id){"SELECT id,name,email,purpose,message,created_at,expires_at,mode,notification FROM beta_applicants WHERE id='$Id'"}else{'SELECT id,name,email,purpose,message,created_at,expires_at,mode,notification FROM beta_applicants ORDER BY created_at'}}
 'delete' {
  if($Id -notmatch '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'){throw 'Valid application UUID required.'}
  if($Apply){"DELETE FROM beta_applicants WHERE id='$Id'"}else{"SELECT id,mode,created_at FROM beta_applicants WHERE id='$Id'"}
 }
}
$raw=& npx --yes wrangler@4 d1 execute stotoon-beta --remote --config deploy/beta/wrangler.jsonc --command $query --json
if($LASTEXITCODE -ne 0){throw 'D1 operation failed.'}
$result=($raw -join "`n") | ConvertFrom-Json -DateKind String
if($Action -eq 'csv'){
 $folder=Join-Path (Get-Location) 'data/private/exports'
 New-Item -ItemType Directory -Force -Path $folder | Out-Null
 $file=Join-Path $folder ('beta-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N')+'.csv')
 $rows=@($result[0].results)
 foreach($row in $rows){foreach($prop in $row.PSObject.Properties){$value=[string]$prop.Value;if($value -match '^\s*[=+@-]|^[\t\r\n]'){$prop.Value="'"+$value}}}
 if($rows.Count){$rows | Export-Csv -LiteralPath $file -NoTypeInformation -Encoding utf8BOM}else{'"id","name","email","purpose","message","created_at","expires_at","mode","notification"' | Set-Content -LiteralPath $file -Encoding utf8BOM}
 Write-Output "Saved $($rows.Count) records: $file"
 Write-Output 'Private export: do not upload. Apply the same retention/deletion policy to this copy.'
}else{$result | ConvertTo-Json -Depth 8}
if($Action -eq 'delete' -and -not $Apply){Write-Output 'Preview only. Verify the exact record, then repeat with -Apply to delete.'}
