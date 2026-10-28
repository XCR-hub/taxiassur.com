import{readFileSync}from'node:fs';
import{spawnSync}from'node:child_process';
export function generaliServerAccess(file='F:/TaxiAssur/Automation/Generali/server-runtime/secrets/access.dpapi'){
 const script="$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Security;$b=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim());$p=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::LocalMachine);[Console]::Out.Write([Text.Encoding]::UTF8.GetString($p))";
 const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{input:readFileSync(file).toString('base64'),encoding:'utf8',windowsHide:true,timeout:15000});
 if(result.error||result.status!==0)throw Error('generali_server_access_unavailable');
 return JSON.parse(result.stdout);
}
