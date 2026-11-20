param([Parameter(Mandatory=$true)][string]$BodyFile)
$ErrorActionPreference='Stop'
$repoApi='https://api.github.com/repos/silenwild-jpg/mini-koala-miniprogram-prototype'
$headName='codex/inventory-display-density-20261120'
$baseName='feat/wx-native-rule-baseline-20261120'
$body=Get-Content -LiteralPath $BodyFile -Raw -Encoding utf8
foreach($field in @('基线 Commit','活动页面','获批视觉','变更对照','375','390','视觉签收','回滚')){if(!$body.Contains($field)){throw "PR evidence field missing: $field"}}
foreach($statusName in @('G-TECH','VIS_SIGNED','DEPLOYED')){if($body -notmatch ($statusName+':\s*(PASS|HOLD|NOT_TESTED)')){throw "PR evidence status missing: $statusName"}}
$publicHeaders=@{Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28'}
$existingResponse=Invoke-RestMethod -Uri ($repoApi+'/pulls?state=open&head=silenwild-jpg%3Acodex%2Finventory-display-density-20261120') -Headers $publicHeaders
$existing=@(foreach($candidatePr in $existingResponse){if($candidatePr.number){$candidatePr}})
if($existing.Count -gt 1){throw 'Multiple open PRs found; no mutation performed'}
if($existing.Count -eq 1 -and $existing[0].base.ref -ne $baseName){throw 'Existing PR targets another base; no retarget performed'}
if($existing.Count -eq 1 -and !$existing[0].draft){throw 'Existing PR is not draft; no mutation performed'}
# Reuse Git's configured credential helper. Credentials remain in memory, never printed or written.
$credentialRequest="protocol=https`nhost=github.com`npath=silenwild-jpg/mini-koala-miniprogram-prototype.git`n`n"
$credentialReply=$credentialRequest | git -c credential.interactive=false credential fill 2>$null
if($LASTEXITCODE -ne 0){throw 'Git credential helper unavailable; no PR mutation performed'}
$credentialFields=@{};foreach($line in $credentialReply){$parts=$line -split '=',2;if($parts.Count -eq 2){$credentialFields[$parts[0]]=$parts[1]}}
if(!$credentialFields['password']){throw 'Git credential helper returned no usable authentication; no PR mutation performed'}
$prHeaders=@{Accept='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28';Authorization=('Bearer '+$credentialFields['password'])}
$payload=@{title='COLLAB-SETUP-01: reviewed native fixes and simulator evidence';body=$body}
try{
 if($existing.Count -eq 1){$uri=$repoApi+'/pulls/'+$existing[0].number;$method='Patch'}
 else{$uri=$repoApi+'/pulls';$method='Post';$payload.head=$headName;$payload.base=$baseName;$payload.draft=$true;$payload.maintainer_can_modify=$false}
 $response=Invoke-RestMethod -Uri $uri -Method $method -Headers $prHeaders -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($payload|ConvertTo-Json -Depth 5)))
 [pscustomobject]@{number=$response.number;url=$response.html_url;draft=$response.draft;head=$response.head.sha;base=$response.base.ref}|ConvertTo-Json
}catch{
 $httpStatus=if($_.Exception.Response){[int]$_.Exception.Response.StatusCode}else{'NETWORK_ERROR'}
 throw "GitHub PR operation failed ($httpStatus); credential material omitted"
}finally{
 $prHeaders.Remove('Authorization');$credentialFields.Clear();$credentialReply=$null;$credentialRequest=$null
}
