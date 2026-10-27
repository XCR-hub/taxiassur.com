const {test}=require('node:test'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {upsert,prune}=require('./lib/d1-cache-sql.cjs');
const quote=v=>v===null?'NULL':"'"+String(v).replace(/'/g,"''")+"'";
test('identical rows cause no writes, changes and NULL transitions are retained',()=>{
 const db=new DatabaseSync(':memory:');try{db.exec('CREATE TABLE cache(source_table TEXT,source_id TEXT,title TEXT,payload TEXT,PRIMARY KEY(source_table,source_id))');const statement=values=>upsert('cache',['source_table','source_id','title','payload'],values.map(quote));
 db.exec(statement(['blog','one',null,'original']));const before=db.prepare('SELECT total_changes() n').get().n;
 db.exec(statement(['blog','one',null,'original']));assert.equal(db.prepare('SELECT total_changes() n').get().n,before);
 db.exec(statement(['blog','one','Updated','new']));assert.equal(db.prepare('SELECT title FROM cache').get().title,'Updated');
 db.exec(statement(['blog','one',null,'new']));assert.equal(db.prepare('SELECT title FROM cache').get().title,null);
 }finally{db.close();}
});
test('bounded pruning removes disappeared rows and preserves other sources, quotes and Unicode IDs',()=>{
 const db=new DatabaseSync(':memory:');try{db.exec('CREATE TABLE cache(source_table TEXT,source_id TEXT,PRIMARY KEY(source_table,source_id))');const keep=Array.from({length:1100},(_,i)=>'id-'+String(i).padStart(5,'0')).concat(["a'b",'éclair','😀']);const insert=db.prepare('INSERT INTO cache VALUES(?,?)');for(const id of [...keep,'','id-00000-removed','zzzz'])insert.run('blog',id);insert.run('other','retained');
 const sql=prune('cache','blog',keep);assert.ok(sql.length>2);assert.ok(sql.every(s=>Buffer.byteLength(s)<45000));sql.forEach(s=>db.exec(s));assert.equal(db.prepare("SELECT count(*) n FROM cache WHERE source_table='blog'").get().n,keep.length);assert.equal(db.prepare("SELECT count(*) n FROM cache WHERE source_table='other'").get().n,1);
 const before=db.prepare('SELECT total_changes() n').get().n;sql.forEach(s=>db.exec(s));assert.equal(db.prepare('SELECT total_changes() n').get().n,before);
 prune('cache','blog',[]).forEach(s=>db.exec(s));assert.equal(db.prepare('SELECT count(*) n FROM cache').get().n,1);
 }finally{db.close();}
});
test('full generator reimports without content writes and rejects incomplete snapshots atomically',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d1-incremental-'));t.after(()=>{if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'d1-incremental-'))throw Error('Unexpected fixture path');fs.rmSync(dir,{recursive:true,force:true});});const tables=path.join(dir,'tables');fs.mkdirSync(tables);
 const sources=['blog_posts','city_pages','faq_entries','news_articles','gsc_pages','gsc_queries'];for(const table of sources)fs.writeFileSync(path.join(tables,table+'.jsonl'),JSON.stringify({id:'one',slug:table,title:'Public fixture',question:'Question',status:'published',url:'https://fixture.invalid/',date:'2026-10-27',impressions:5,clicks:1})+'\n');
 const output=path.join(dir,'cache.sql'),build=()=>spawnSync(process.execPath,[path.join(__dirname,'d1-build-public-cache.cjs'),'--backup',dir,'--out',output],{encoding:'utf8'});
 assert.equal(build().status,0);const sql=fs.readFileSync(output,'utf8');assert.ok(!/DELETE FROM (public_content_cache|gsc_metrics_cache);/.test(sql));
 const db=new DatabaseSync(':memory:');try{db.exec(fs.readFileSync(path.join(__dirname,'../cloudflare/d1/schema-public-cache.sql'),'utf8'));db.exec(sql);const count=()=>db.prepare('SELECT total_changes() n').get().n;const before=count();db.exec(sql);assert.equal(count(),before);
 }finally{db.close();}
 fs.unlinkSync(path.join(tables,'blog_posts.jsonl'));assert.notEqual(build().status,0);assert.equal(fs.readFileSync(output,'utf8'),sql);
 fs.writeFileSync(path.join(tables,'blog_posts.jsonl'),'{invalid JSON\n');assert.notEqual(build().status,0);assert.equal(fs.readFileSync(output,'utf8'),sql);
});
