import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {table} from './lib/format.mjs';
import {parseCsv} from './lib/csv.mjs';

export const fields={
 customers:'name email phone',rooms:'name capacity timezone country',
 events:'name customer_id status guests currency agreed_cents deposit_cents deposit_due balance_due last_contact_at final_numbers_due numbers_confirmed dietary_notes dietary_reviewed alcohol licence_evidence duty_manager host_plan food_water_confirmed alternatives_confirmed transport_confirmed',
 sessions:'name event_id room_id starts_at ends_at setup_minutes clear_minutes',items:'name event_id kind quantity unit_cents cost_cents allergens allergen_verified service_at',
 receipts:'name event_id amount_cents received_at',staff:'name role',shifts:'name event_id staff_id starts_at ends_at',tasks:'name event_id owner due_at done',notes:'name event_id occurred_at'
};
const refs={customer_id:'customers',event_id:'events',room_id:'rooms',staff_id:'staff'};
const ints=new Set('capacity guests agreed_cents deposit_cents setup_minutes clear_minutes quantity unit_cents cost_cents amount_cents'.split(' '));
const bools=new Set('numbers_confirmed dietary_reviewed alcohol food_water_confirmed alternatives_confirmed transport_confirmed allergen_verified done'.split(' '));
const active="status in ('enquiry','tentative','confirmed')";
export const reads={
 customers:'select id,name,email,phone from customers order by name',
 rooms:'select id,name,capacity,timezone,country from rooms order by name',
 events:'select id,name,status,guests,currency,agreed_cents from events order by name',
 diary:"select event,session,room,status,guests,local_start,local_end,timezone from function_diary where status in ('tentative','confirmed') and ends_at>=now() order by starts_at",
 'room-clashes':'select * from room_clashes',
 'staff-clashes':'select * from staff_clashes',
 'enquiries':"select name,status,last_contact_at,guests,currency,agreed_cents from events where status in ('enquiry','tentative') order by last_contact_at",
 'deposits-due':`select name,currency,deposit_due,deposit_cents,received_cents,deposit_outstanding_cents from event_money where ${active} and deposit_outstanding_cents>0 order by deposit_due nulls first`,
 'balances-due':`select name,status,currency,balance_due,agreed_cents,received_cents,balance_cents from event_money where status<>'cancelled' and balance_cents<>0 order by balance_due nulls first`,
 'kitchen':"select event,guests,numbers_confirmed,dietary_notes,dietary_reviewed,item,quantity,allergens,allergen_verified,service_at from kitchen_handover order by service_at nulls first,event",
 'final-numbers':`select name,guests,final_numbers_due,numbers_confirmed,dietary_notes,dietary_reviewed from events where ${active} and (not numbers_confirmed or not dietary_reviewed) order by final_numbers_due nulls first`,
 'run-sheet':"select event,session,room,local_start,local_end,timezone,guests from function_diary where status in ('tentative','confirmed') order by starts_at",
 'staffing':"select e.name event,st.name staff,st.role,s.name shift,s.starts_at,s.ends_at from shifts s join events e on e.id=s.event_id join staff st on st.id=s.staff_id where e.status in ('tentative','confirmed') order by s.starts_at",
 tasks:'select t.id,e.name event,t.name task,t.owner,t.due_at,t.done from tasks t join events e on e.id=t.event_id order by t.done,t.due_at',
 'margin-review':`select name,status,currency,agreed_cents,item_sales_cents,item_cost_cents,estimated_contribution_cents,(agreed_cents-item_sales_cents) unmatched_agreed_cents from event_money where status<>'cancelled' order by estimated_contribution_cents`,
 'customer-review':`select c.name customer,e.status,e.currency,count(*) events,sum(e.agreed_cents) agreed_cents,sum(m.balance_cents) balance_cents from customers c join events e on e.customer_id=c.id join event_money m on m.id=e.id group by c.name,c.id,e.status,e.currency order by c.name,e.status,e.currency`,
 'conversion':"select status,count(*) events from events group by status order by status",
 'attention':`select name event,'Stale enquiry' finding,last_contact_at::text evidence from events where status in ('enquiry','tentative') and last_contact_at<now()-interval '7 days'
 union all select name,'Deposit overdue',deposit_due::text from event_money where ${active} and deposit_outstanding_cents>0 and deposit_due<current_date
 union all select e.name,'Task overdue: '||t.name,t.due_at::text from tasks t join events e on e.id=t.event_id where not t.done and t.due_at<now() and e.${active}
 union all select name,'Final numbers overdue',final_numbers_due::text from events where ${active} and not numbers_confirmed and final_numbers_due<current_date
 union all select event,'Room clash with '||other_event,room||' '||local_start from room_clashes
 union all select event,'Staff clash: '||staff,other_event from staff_clashes`,
 compliance:`select distinct event,'CAPACITY' rule,'Guests exceed configured room capacity' finding from function_diary where status in ('tentative','confirmed') and guests>capacity
 union all select e.name,'ALLERGEN-INFO','Food item needs verified allergen information: '||i.name from events e join items i on i.event_id=e.id where e.status in ('tentative','confirmed') and i.kind='food' and not i.allergen_verified
 union all select name,'DIETARY-HANDOVER','Dietary needs not reviewed with kitchen' from events where status in ('tentative','confirmed') and not dietary_reviewed
 union all select distinct e.name,'NZ-HOST','Record food, free water, low/no alcohol drinks and transport plan' from events e join function_diary d on d.event_id=e.id where e.status in ('tentative','confirmed') and e.alcohol and d.country='NZ' and (not food_water_confirmed or not alternatives_confirmed or not transport_confirmed or trim(host_plan)='')
 union all select distinct e.name,'NZ-LICENCE-REVIEW','Record licence evidence and responsible manager for review' from events e join function_diary d on d.event_id=e.id where e.status in ('tentative','confirmed') and e.alcohol and d.country='NZ' and (trim(licence_evidence)='' or trim(duty_manager)='')
 union all select distinct e.name,'AU-LICENCE-REVIEW','Review applicable state or territory liquor conditions' from events e join function_diary d on d.event_id=e.id where e.status in ('tentative','confirmed') and e.alcohol and d.country='AU' and (trim(licence_evidence)='' or trim(duty_manager)='' or trim(host_plan)='')
 union all select e.name,'ROOM-REVIEW','No room session recorded: capacity and jurisdiction unknown' from events e where e.status in ('tentative','confirmed') and not exists(select 1 from sessions s where s.event_id=e.id)`
};
export async function resolve(db,entity,value){
 if(!fields[entity])throw Error(`Unknown entity: ${entity}`);
 const s=String(value??'').trim();if(!s)throw Error('A name or ID is required');
 let rows=await db.query(`select * from ${entity} where id::text=$1 or lower(name)=lower($1)`,[s]);
 if(!rows.length)rows=await db.query(`select * from ${entity} where starts_with(id::text,$1) or strpos(lower(name),lower($1))>0 order by name,id`,[s]);
 if(rows.length!==1)throw Error(`${rows.length?'Ambiguous':'No match'} ${entity}: ${s}${rows.length?'\n'+rows.map(r=>r.id+' '+r.name).join('\n'):''}`);
 return rows[0];
}
function obj(text){const x=typeof text==='string'?JSON.parse(text):text;if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Expected one JSON object');return x;}
export async function write(db,entity,data,existing=null){
 if(!fields[entity])throw Error('Unknown entity '+entity);
 const allowed=fields[entity].split(' '),values={};
 for(const [key,value] of Object.entries(obj(data))){
  if(!allowed.includes(key))throw Error(`Unknown field ${entity}.${key}`);
  let v=value;
  if(refs[key]){v=(await resolve(db,refs[key],value)).id;if(existing&&existing[key]!==v)throw Error('Cannot change parent relationships; create a reviewed replacement');}
  if(ints.has(key)){if(typeof v==='string'&&/^\d+$/.test(v))v=Number(v);if(!Number.isSafeInteger(v)||v<0||v>2147483647)throw Error(key+' requires a whole nonnegative integer');}
  if(bools.has(key)&&typeof v!=='boolean')throw Error(key+' requires true or false');
  if(key.endsWith('_at')){if(v===null||typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error(key+' requires an ISO timestamp with timezone');}
  if(key.endsWith('_due')&&v!==null){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(key+' requires YYYY-MM-DD');}
  if(v===null&&!key.endsWith('_due'))throw Error(key+' cannot be null');
  if(typeof v==='string'&&['name','owner','timezone'].includes(key)&&!v.trim())throw Error(key+' cannot be blank');
  values[key]=v;
 }
 if(!Object.keys(values).length)throw Error('No fields to write');
 if(entity==='rooms'&&values.timezone){if(!(await db.query('select name from pg_timezone_names where name=$1',[values.timezone])).length)throw Error('Unknown timezone');}
 if(entity==='events'&&existing&&values.currency&&values.currency!==existing.currency){if((await db.query('select id from receipts where event_id=$1 union all select id from items where event_id=$1',[existing.id])).length)throw Error('Cannot change currency after money records exist');}
 if(entity==='receipts'&&existing)throw Error('Receipts are append-only evidence; correct through a reviewed migration');
 const keys=Object.keys(values),params=Object.values(values);
 if(existing){params.push(existing.id);return (await db.query(`update ${entity} set ${keys.map((k,i)=>k+'=$'+(i+1)).join(',')} where id=$${params.length} returning *`,params))[0];}
 return (await db.query(`insert into ${entity} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,params))[0];
}
async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{const result=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function importData(db,dir,dry){
 const mapping=JSON.parse(fs.readFileSync(path.join(dir,'mapping.json'),'utf8'));
 const order=Object.keys(fields),sourceIds=new Map(),result=[];
 if(Object.keys(mapping).some(k=>!fields[k]))throw Error('Unknown entity in mapping');
 return transaction(db,async()=>{
  for(const entity of order){const spec=mapping[entity];if(!spec)continue;
   if(!spec.file||path.basename(spec.file)!==spec.file||!spec.columns||typeof spec.columns!=='object')throw Error('Mapping needs a CSV filename and columns object');
   const rows=parseCsv(fs.readFileSync(path.join(dir,spec.file),'utf8'));let added=0,skipped=0;
   if(!Object.values(spec.columns).includes('source_id'))throw Error('Map a stable source_id for '+entity);
   const mapped=Object.values(spec.columns).filter(Boolean);if(new Set(mapped).size!==mapped.length)throw Error('Duplicate mapped fields');
   for(const raw of rows){
    const unknown=Object.keys(raw).filter(k=>!(k in spec.columns));if(unknown.length)throw Error('Unmapped columns: '+unknown.join(', '));
    const missing=Object.keys(spec.columns).filter(k=>!(k in raw));if(missing.length)throw Error('Missing mapped columns: '+missing.join(', '));
    let source;const data={};
    for(const [header,key] of Object.entries(spec.columns)){
     if(key===null)continue;if(key==='source_id'){source=raw[header].trim();continue;}
     if(!fields[entity].split(' ').includes(key))throw Error('Unknown mapped field '+key);
     let v=raw[header];if(v==='')continue;
     if(refs[key]){const ref=refs[key],found=sourceIds.get(ref+':'+v)||(await db.query('select record_id from import_rows where entity=$1 and source_id=$2',[ref,v]))[0]?.record_id;if(!found)throw Error(`Missing imported reference ${ref}:${v}`);v=found;}
     if(bools.has(key)){if(!['true','false','yes','no','1','0'].includes(v.toLowerCase()))throw Error('Invalid boolean '+header);v=['true','yes','1'].includes(v.toLowerCase());}
     data[key]=v;
    }
    if(!source)throw Error('Empty source_id');
    const fingerprint=createHash('sha256').update(JSON.stringify({raw,spec})).digest('hex');
    const prior=(await db.query('select * from import_rows where entity=$1 and source_id=$2',[entity,source]))[0];
    if(prior){if(prior.fingerprint!==fingerprint)throw Error(`Changed source row ${entity}:${source}; review before replacing`);sourceIds.set(entity+':'+source,prior.record_id);skipped++;continue;}
    const row=await write(db,entity,data);sourceIds.set(entity+':'+source,row.id);
    await db.query('insert into import_rows(entity,source_id,record_id,raw_row,mapping,fingerprint) values($1,$2,$3,$4,$5,$6)',[entity,source,row.id,JSON.stringify(raw),JSON.stringify(spec),fingerprint]);added++;
   }result.push({entity,added,skipped,dry_run:dry});
  }if(!result.length)throw Error('No mapped data');return result;
 },dry);
}
function csv(rows){if(!rows.length)return '';const keys=Object.keys(rows[0]);const quote=v=>'"'+String(v==null?'':typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';return [keys.map(quote).join(','),...rows.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n')+'\r\n';}
export async function run(db,args){
 args=args.filter(a=>a!=='--json');const [cmd='help',...rest]=args;
 if(reads[cmd]){if(rest.length)throw Error(cmd+' takes no arguments');return db.query(reads[cmd]);}
 if(cmd==='help')return [{commands:[...Object.keys(reads),'record <entity> <name|id>','add <entity> <json>','update <entity> <name|id> <json>','log <event> <note>','import function-tracker <folder> [--dry-run]','export <new-folder>','weekly-review','draft-follow-up <event>','draft-function <event>'].join('\n'),fields:JSON.stringify(fields),notes:'All commands accept --json. Money uses cents in the event currency. Timestamps require explicit offsets. Export is an interchange snapshot, not a restore.'}];
 if(cmd==='record'){const [entity,match]=rest;const record=await resolve(db,entity,match);if(entity!=='events')return [record];const children={};for(const [t,f]of Object.entries(fields))if(f.split(' ').includes('event_id'))children[t]=await db.query(`select * from ${t} where event_id=$1 order by created_at`,[record.id]);return [{...record,children}];}
 if(cmd==='add')return transaction(db,async()=>[await write(db,rest[0],rest[1])]);
 if(cmd==='update')return transaction(db,async()=>[await write(db,rest[0],rest[2],await resolve(db,rest[0],rest[1]))]);
 if(cmd==='log')return transaction(db,async()=>{const e=await resolve(db,'events',rest[0]);if(!rest[1]?.trim())throw Error('A note is required');const at=new Date().toISOString();const n=await write(db,'notes',{event_id:e.id,name:rest[1],occurred_at:at});await write(db,'events',{last_contact_at:at},e);return[n];});
 if(cmd==='weekly-review'){const out=[];for(const c of ['attention','deposits-due','final-numbers','compliance'])for(const row of await run(db,[c]))out.push({desk:c,...row});return out;}
 if(cmd==='import'){if(rest[0]!=='function-tracker'||!rest[1]||rest.slice(2).some(x=>x!=='--dry-run'))throw Error('import function-tracker <folder> [--dry-run]');return importData(db,path.resolve(rest[1]),rest.includes('--dry-run'));}
 if(cmd==='export'){
  if(!rest[0])throw Error('export <new-folder>');const dir=path.resolve(rest[0]);if(fs.existsSync(dir))throw Error('Export folder already exists');
  const all=await transaction(db,async()=>{await db.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');const out={};for(const t of [...Object.keys(fields),'audit','import_rows'])out[t]=await db.query(`select * from ${t} order by id`);return out;});
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'all.json'),JSON.stringify(all,null,2)+'\n');for(const[t,rows]of Object.entries(all))fs.writeFileSync(path.join(dir,t+'.csv'),csv(rows));return Object.entries(all).map(([entity,rows])=>({entity,rows:rows.length}));
 }
 if(['draft-follow-up','draft-function'].includes(cmd)){
  const e=await resolve(db,'events',rest[0]),record=(await run(db,['record','events',e.id]))[0],money=(await db.query('select * from event_money where id=$1',[e.id]))[0];
  const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`${cmd}-${e.id}-${Date.now()}.md`);
  const body=cmd==='draft-follow-up'?`Hello,\n\nWe are checking the arrangements for ${e.name}. Please confirm the final guest count and dietary requirements. Our records show ${e.guests} guests. The recorded outstanding deposit is ${e.currency} ${(Number(money.deposit_outstanding_cents)/100).toFixed(2)}. Please let us know if a recent payment needs reconciling.\n\nThank you.`:`Function brief: ${e.name}\n\nStatus: ${e.status}. Guests: ${e.guests}.\n\nDietary notes: ${e.dietary_notes||'Not recorded'}. Kitchen reviewed: ${e.dietary_reviewed}.\n\nCheck the attached source records before sharing.`;
  fs.writeFileSync(file,`# Internal draft for review\n\n${body}\n\n## Source records\n\n\x60\x60\x60json\n${JSON.stringify({record,money},null,2)}\n\x60\x60\x60\n`);return [{file,event:e.name}];
 }
 throw Error('Unknown command '+cmd);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const rows=await run(db,process.argv.slice(2));if(process.argv.includes('--json'))console.log(JSON.stringify(rows,null,2));else console.log(table(rows,[...new Set(rows.flatMap(Object.keys))].map(key=>({key,label:key,format:(v,row)=>v instanceof Date?v.toISOString():key.endsWith('_cents')&&v!==undefined?`${row.currency||''} ${(Number(v)/100).toFixed(2)}`.trim():typeof v==='object'&&v!==null?JSON.stringify(v):v}))));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
