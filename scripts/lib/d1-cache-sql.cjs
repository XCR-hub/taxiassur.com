const quote=value=>"'"+String(value).replace(/'/g,"''")+"'";
function identifier(value){if(!/^[a-z_]+$/.test(value))throw Error('Invalid cache SQL identifier');return value;}
function upsert(table,columns,values,keys=['source_table','source_id']){
 identifier(table);columns.forEach(identifier);keys.forEach(identifier);
 if(columns.length!==values.length||keys.some(key=>!columns.includes(key)))throw Error('Invalid cache SQL columns');
 const updated=columns.filter(column=>!keys.includes(column));
 return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (${keys.join(', ')}) DO UPDATE SET ${updated.map(column=>`${column}=excluded.${column}`).join(', ')} WHERE ${updated.map(column=>`${table}.${column} IS NOT excluded.${column}`).join(' OR ')};`;
}
function prune(table,source,ids){
 identifier(table);
 const sorted=[...new Set(ids)].sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b)));
 if(!sorted.length)return [`DELETE FROM ${table} WHERE source_table=${quote(source)};`];
 const chunks=[];let chunk=[],bytes=0;
 for(const id of sorted){const size=Buffer.byteLength(quote(id))+2;if(size>40000)throw Error('Cache source ID too large');if(chunk.length&&(chunk.length>=500||bytes+size>40000)){chunks.push(chunk);chunk=[];bytes=0;}chunk.push(id);bytes+=size;}
 if(chunk.length)chunks.push(chunk);
 return chunks.map((values,index)=>`DELETE FROM ${table} WHERE source_table=${quote(source)}${index?' AND source_id>'+quote(chunks[index-1].at(-1)):''}${index<chunks.length-1?' AND source_id<='+quote(values.at(-1)):''} AND source_id NOT IN (${values.map(quote).join(', ')});`);
}
module.exports={upsert,prune};
