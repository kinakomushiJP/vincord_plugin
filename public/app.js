const $=s=>document.querySelector(s);
const files=[];
const drop=$("#drop"), input=$("#files"), list=$("#plugins"), log=$("#log"), status=$("#status"), build=$("#build");

function write(s){log.textContent += (log.textContent.trim()? "\n":"")+s; log.scrollTop=log.scrollHeight}
function render(){
 list.innerHTML="";
 files.forEach((f,i)=>{
   const el=document.createElement("div"); el.className="plugin";
   el.innerHTML=`<div>📦 <b>${escapeHtml(f.name)}</b><br><span>${(f.size/1024/1024).toFixed(2)} MB</span></div><button data-i="${i}">削除</button>`;
   el.querySelector("button").onclick=()=>{files.splice(i,1);render()};
   list.appendChild(el);
 });
}
function escapeHtml(x){return x.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function add(fs){[...fs].filter(f=>f.name.toLowerCase().endsWith(".zip")).forEach(f=>files.push(f));render()}
$("#pick").onclick=()=>input.click(); input.onchange=e=>add(e.target.files);
["dragenter","dragover"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.add("drag")}));
["dragleave","drop"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.remove("drag")}));
drop.addEventListener("drop",e=>add(e.dataTransfer.files));
$("#clear").onclick=()=>log.textContent="";

async function sha256(blob){
 const b=await blob.arrayBuffer(), h=await crypto.subtle.digest("SHA-256",b);
 return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function api(path, options={}){
 const token=$("#token").value.trim();
 const r=await fetch(`https://api.github.com${path}`,{...options,headers:{
   "Accept":"application/vnd.github+json","Authorization":`Bearer ${token}`,"X-GitHub-Api-Version":"2022-11-28",
   ...(options.headers||{})
 }});
 if(!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
 return r.status===204?null:r.json();
}
function b64(bytes){
 let s=""; const chunk=0x8000;
 for(let i=0;i<bytes.length;i+=chunk)s+=String.fromCharCode(...bytes.subarray(i,i+chunk));
 return btoa(s);
}
async function putFile(owner,repo,path,content,message,branch){
 let sha;
 try{sha=(await api(`/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`)).sha}catch{}
 const body={message,content:typeof content==="string"?btoa(unescape(encodeURIComponent(content))):b64(new Uint8Array(await content.arrayBuffer())),branch};
 if(sha)body.sha=sha;
 return api(`/repos/${owner}/${repo}/contents/${path}`,{method:"PUT",body:JSON.stringify(body)});
}

build.onclick=async()=>{
 const owner=$("#owner").value.trim(), repo=$("#repo").value.trim(), token=$("#token").value.trim();
 if(!owner||!repo||!token){alert("GitHubユーザー名、リポジトリ、Tokenを入力してください。");return}
 if(!files.length){alert("プラグインZIPを1つ以上追加してください。");return}
 build.disabled=true; status.textContent="準備中"; log.textContent="";
 try{
   write("GitHubリポジトリを確認しています...");
   const repoInfo=await api(`/repos/${owner}/${repo}`);
   const branch=`vencord-builder-${Date.now()}`;
   const base=repoInfo.default_branch||"main";
   const ref=await api(`/git/ref/heads/${base}`);
   await api(`/git/refs`,{method:"POST",body:JSON.stringify({ref:`refs/heads/${branch}`,sha:ref.object.sha})});
   write(`ブランチ ${branch} を作成しました。`);

   const manifest=[];
   for(const f of files){
     const id=(await sha256(f)).slice(0,12);
     const path=`builder-plugins/${id}-${f.name}`;
     write(`アップロード: ${f.name}`);
     await putFile(owner,repo,path,f,`Add plugin ${f.name}`,branch);
     manifest.push({name:f.name,path});
   }
   await putFile(owner,repo,"builder-plugins/manifest.json",JSON.stringify({plugins:manifest,enableAll:$("#enableAll").checked,clean:$("#clean").checked,artifact:$("#artifact").checked},null,2),"Update plugin manifest",branch);

   write("GitHub Actionsを起動しています...");
   await api(`/repos/${owner}/${repo}/actions/workflows/build-vencord.yml/dispatches`,{method:"POST",body:JSON.stringify({ref:branch})});
   status.textContent="ビルド開始";
   write("ビルドを開始しました。数分後にActionsのArtifactが生成されます。");
   const url=`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions`;
   $("#result").innerHTML=`<a class="result" target="_blank" href="${url}">↗ GitHub Actionsを開いてビルド結果を見る</a>`;
 }catch(e){
   status.textContent="エラー"; write("❌ "+e.message);
   $("#result").innerHTML=`<div class="result error">${escapeHtml(e.message)}</div>`;
 }finally{build.disabled=false}
};