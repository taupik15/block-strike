/* Central-directory ZIP reader. Extracts only requested entries in this worker. */
importScripts('vendor/pako-inflate.min.js');
const MiB=1024*1024, decoder=new TextDecoder();
const allowed=/\.(bsp|wad|pwf|graph|nav|png|tga|bmp|jpg|jpeg|mdl|glb|spr|wav|mp3|ogg|txt)$/i;
let archive, entries=[];
const error=message=>{throw Error(message)};
const crcTable=Uint32Array.from({length:256},(_,n)=>{
 for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;
 return n;
});
async function read(file,offset,length){
 if(offset<0||length<0||offset+length>file.size)error('Invalid ZIP offset.');
 return new DataView(await file.slice(offset,offset+length).arrayBuffer());
}
function nameAt(view,start,length){
 return decoder.decode(new Uint8Array(view.buffer,view.byteOffset+start,length));
}
function validPath(value){
 const path=value.replaceAll('\\','/');
 return path.length<=480&&!path.startsWith('/')&&!/[:\x00-\x1f\x7f]/.test(path)&&path.split('/').every(x=>x&&x!=='.'&&x!=='..')?path:null;
}
async function index(file){
 if(file.size>128*MiB||file.size<22)error('Use a standard ZIP up to 128 MiB.');
 const length=Math.min(65557+16,file.size), tail=await read(file,file.size-length,length);
 let end=length-22;
 function footerAt(at){
  if(tail.getUint32(at,true)!==0x06054b50)return false;
  const last=at+22+tail.getUint16(at+20,true);
  if(last>length||last<length-16)return false;
  for(let i=last;i<length;i++)if(![9,10,13,32].includes(tail.getUint8(i)))return false;
  return true;
 }
 while(end>=0&&!footerAt(end))end--;
 if(end<0)error('ZIP directory not found.');
 const count=tail.getUint16(end+10,true),size=tail.getUint32(end+12,true),offset=tail.getUint32(end+16,true);
 if(tail.getUint16(end+4,true)||tail.getUint16(end+6,true)||tail.getUint16(end+8,true)!==count||
    count>8192||size>4*MiB||offset+size>file.size-length+end)error('ZIP64, split ZIPs, or oversized directories are unsupported.');
 const dir=await read(file,offset,size), list=[];
 for(let i=0,p=0;i<count;i++){
  if(p+46>size||dir.getUint32(p,true)!==0x02014b50)error('Invalid ZIP directory entry.');
  const nl=dir.getUint16(p+28,true),xl=dir.getUint16(p+30,true),cl=dir.getUint16(p+32,true);
  const next=p+46+nl+xl+cl;
  if(next>size)error('Truncated ZIP directory.');
  const original=nameAt(dir,p+46,nl),path=validPath(original),flags=dir.getUint16(p+8,true),
   method=dir.getUint16(p+10,true),compressed=dir.getUint32(p+20,true),bytes=dir.getUint32(p+24,true),
   start=dir.getUint32(p+42,true),unixMode=dir.getUint32(p+38,true)>>>16;
  if(path&&allowed.test(path)){
   const max=/\.(wad|bsp)$/i.test(path)?32*MiB:8*MiB;
   const issue=flags&0x41?'Encrypted ZIP entry':
    method!==0&&method!==8?'Unsupported ZIP compression':
    (unixMode&0xf000)===0xa000?'ZIP links are unsupported':
    bytes>max||compressed>file.size||start>=offset?'ZIP entry exceeds import limits':'';
   list.push({id:list.length,path,original,method,compressed,bytes,start,flags,crc:dir.getUint32(p+16,true),issue,limit:offset});
  }
  p=next;
 }
 archive=file;entries=list;
 return list.map(({id,path,bytes,issue})=>({id,path,bytes,issue}));
}
async function extract(id){
 const entry=entries[id];
 if(!archive||!entry||entry.issue)error(entry?.issue||'Unknown ZIP entry.');
 const local=await read(archive,entry.start,30);
 if(local.getUint32(0,true)!==0x04034b50||local.getUint16(8,true)!==entry.method||
    local.getUint16(6,true)!==entry.flags)error('Invalid ZIP local header.');
 const nl=local.getUint16(26,true),xl=local.getUint16(28,true),offset=entry.start+30+nl+xl;
 if(offset+entry.compressed>entry.limit||nameAt(await read(archive,entry.start+30,nl),0,nl)!==entry.original)error('ZIP entry does not match directory.');
 const input=archive.slice(offset,offset+entry.compressed);
 const output=new Uint8Array(entry.bytes);
 let used=0,crc=0xffffffff;
 function append(chunk){
  if(used+chunk.length>output.length)error('ZIP inflated beyond declared size.');
  output.set(chunk,used);used+=chunk.length;
  for(const byte of chunk)crc=crcTable[(crc^byte)&255]^(crc>>>8);
 }
 if(entry.method===0){
  if(entry.compressed!==entry.bytes)error('Invalid size in stored ZIP entry.');
  append(new Uint8Array(await input.arrayBuffer()));
 }else{
  const inflate=new pako.Inflate({raw:true,chunkSize:32768});
  inflate.onData=append;
  const stride=64*1024;
  for(let at=0;at<input.size;at+=stride){
   const end=Math.min(input.size,at+stride);
   const ok=inflate.push(new Uint8Array(await input.slice(at,end).arrayBuffer()),end===input.size);
   if(!ok||inflate.err)error('Invalid DEFLATE stream.');
  }
  if(!inflate.ended)error('Incomplete DEFLATE stream.');
 }
 if(used!==entry.bytes||((crc^0xffffffff)>>>0)!==entry.crc)error('ZIP entry failed size or CRC verification.');
 return output.buffer;
}
self.onmessage=async({data:{request,file,id}})=>{
 try{
  const value=file?await index(file):await extract(id);
  self.postMessage({request,value},value instanceof ArrayBuffer?[value]:[]);
 }catch(err){self.postMessage({request,error:err.message})}
};
