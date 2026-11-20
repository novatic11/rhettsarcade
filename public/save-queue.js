// Background checks share a pending save. Explicit saves capture again after it.
export function createSaveQueue(run){
  let tail=null;
  function save(force=false){
    if(tail&&!force)return tail;
    const job=(tail||Promise.resolve()).then(()=>run(force),()=>run(force));
    tail=job;
    const clear=()=>{if(tail===job)tail=null;};
    job.then(clear,clear);
    return job;
  }
  Object.defineProperty(save,'pending',{get:()=>tail!==null});
  return save;
}
