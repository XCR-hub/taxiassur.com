export function patchStatusFiling(source){
 if(source.includes('findProspectMailbox'))return source;
 const old="const f={id:folderId,name:prospectFolderName(c),";
 if(source.split(old).length!==2)throw Error('unsupported_worker_folder_record');
 source="import {followupFolderName,findProspectMailbox} from './prospect-mail-status.mjs';\n"+source;
 source=source.replace(old,"const previousFolder=folders.get(folderId)||{};const f={...previousFolder,id:folderId,base_name:prospectFolderName(c),name:previousFolder.followup_status?followupFolderName(c,previousFolder.followup_status):prospectFolderName(c),");
 const before="const name=prospectFolderName(c);let dest=folderCache.get(product.id+':'+name);";
 if(source.split(before).length!==2)throw Error('unsupported_worker_mailbox_lookup');
 source=source.replace(before,"const name=(config.statusAccounts||[]).includes(account.address)&&f.followup_status?followupFolderName(c,f.followup_status):prospectFolderName(c);let dest=findProspectMailbox(boxes,product.id,c,f.mailbox_folder_ids?.[account.address])||folderCache.get(product.id+':'+name);");
 const anchor='       // Add a filing membership, preserving Inbox and flags used by existing workers.';
 if(source.split(anchor).length!==2)throw Error('unsupported_worker_membership_anchor');
 source=source.replace(anchor,`       if(!boxes.some(b=>b.id===dest.id)){dest={...dest,parentId:product.id,name};boxes.push(dest);}
       if(dest.name!==name){await call(account.id,'Mailbox/set',{update:{[dest.id]:{name}}});dest.name=name;folderCache.set(product.id+':'+name,dest);}
       if(f.mailbox_folder_ids?.[account.address]!==dest.id){f.mailbox_folder_ids={...f.mailbox_folder_ids,[account.address]:dest.id};await save('inbox_folders',folderId,f);folders.set(folderId,f);}
`+anchor);
 return source;
}
