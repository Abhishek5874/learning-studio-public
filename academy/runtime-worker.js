'use strict';
let python, SQL, kind;
const seed=`PRAGMA foreign_keys = ON;
CREATE TABLE customers(id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT);
CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), total INTEGER NOT NULL, status TEXT NOT NULL);
CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL, stock INTEGER NOT NULL);
INSERT INTO customers VALUES(1,'Asha','Jaipur'),(2,'Ravi','Bengaluru'),(3,'Meera','Chennai'),(4,'Kabir',NULL);
INSERT INTO orders VALUES(101,1,120,'paid'),(102,2,80,'paid'),(103,1,200,'pending'),(104,3,300,'paid');
INSERT INTO products VALUES(1,'Notebook',80,30),(2,'Keyboard',1200,8),(3,'Mouse',500,0),(4,'Pen',20,100);`;
async function init(type){
 if(type===kind)return;
 if(type==='python'){
  importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
  python=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});
 }else{
  importScripts('https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.js');
  SQL=await initSqlJs({locateFile:file=>'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/'+file});
 }
 kind=type;
}
self.onmessage=async({data})=>{
 if(data.project){await runProject(data);return;}
 const {id,type,code,tests,expected,check,input}=data;
 try{
  await init(type);self.postMessage({id,ready:true});
  if(type==='python'){
   const output=[];let chars=0;const lines=String(input||'').split('\n');
   python.setStdout({batched:s=>{if(chars<20000){output.push(s);chars+=s.length;}}});
   python.setStderr({batched:s=>{if(chars<20000){output.push(s);chars+=s.length;}}});
   python.setStdin({stdin:()=>lines.length?lines.shift():null});
   const dict=python.globals.get('dict');const globals=dict();globals.set('__name__','__main__');dict.destroy();
   let value;
   try{
    value=await python.runPythonAsync(code,{globals});
    if(value?.destroy)value.destroy();
    let passed=null,feedback='';
    if(check){
     try{
      if(tests)await python.runPythonAsync(tests,{globals});
      else if(output.join('\n').trim()!==String(expected).trim())throw Error('Output does not yet match the target.');
      passed=true;feedback='All exercise checks passed, including the supplied edge cases.';
     }catch(e){passed=false;feedback=e.message||String(e);}
    }
    self.postMessage({id,output:output.join('\n')||'(No printed output. Use print() to inspect a value.)',passed,feedback});
   }finally{globals.destroy();}
  }else{
   const db=new SQL.Database();
   try{
    db.run(seed);const results=[];
    for(const statement of db.iterateStatements(code)){
     const columns=statement.getColumnNames(),values=[];let n=0;
     while(statement.step()){if(n++<200)values.push(statement.get());if(n>50000)throw Error('Result is too large. Add a LIMIT and try again.');}
     if(columns.length)results.push({columns,values,truncated:n>200});
    }
    const last=results.at(-1);const passed=check?Boolean(last&&JSON.stringify({columns:last.columns,values:last.values})===JSON.stringify(expected)):null;
    self.postMessage({id,results,passed,feedback:check?(passed?'Your result matches the required columns, rows, and order.':'The result does not yet match. Check columns, filters, ordering, and missing rows.'):'',output:results.length?'':'Statement executed. No result table returned.'});
   }finally{db.close();}
  }
 }catch(e){self.postMessage({id,error:e.message||String(e)});}
};
// Project exercises use fresh namespaces/databases for every case. They never
// touch an account service, a real MySQL server or a Salesforce org.
async function runProject({id,type,code,input,check,cases=[],projectSeed}){
 try{
  if(!['python','sql'].includes(type)||typeof code!=='string'||code.length>64000||cases.length>20)throw Error('Project input is too large or invalid.');
  await init(type);self.postMessage({id,ready:true});
  const output=[],checks=[];let chars=0;
  const capture=s=>{if(chars<20000){const line=String(s).slice(0,20000-chars);output.push(line);chars+=line.length;}};
  if(type==='python'){
   python.setStdout({batched:capture});python.setStderr({batched:capture});
   for(const [index,spec]of (check?cases:[null]).entries()){
    output.length=0;chars=0;
    const lines=String(input||'').split('\n');python.setStdin({stdin:()=>lines.length?lines.shift():null});
    const dict=python.globals.get('dict'),globals=dict();dict.destroy();globals.set('__name__','__main__');
    try{
     const result=await python.runPythonAsync(code,{globals});if(result?.destroy)result.destroy();
     if(!spec)continue;
     globals.set('__project_case_json',JSON.stringify(spec));
     const raw=await python.runPythonAsync(`
import json as __pj
__spec = __pj.loads(__project_case_json)
try:
    exec(__spec.get('setup') or '', globals())
    __actual = eval(__spec['expression'], globals())
except Exception as __exc:
    __error_name = type(__exc).__name__
    __case_result = {'passed': __spec.get('expectError') == __error_name, 'actual': __error_name + ': ' + str(__exc)[:1000], 'expected': __spec.get('expectError') or repr(__spec.get('expected'))}
else:
    try:
        __same = type(__actual) is type(__spec.get('expected')) and __pj.dumps(__actual, sort_keys=True, allow_nan=False) == __pj.dumps(__spec.get('expected'), sort_keys=True, allow_nan=False)
    except (TypeError, ValueError):
        __same = False
    __case_result = {'passed': not __spec.get('expectError') and __same, 'actual': repr(__actual)[:1600], 'expected': __spec.get('expectError') or repr(__spec.get('expected'))[:1600]}
__pj.dumps(__case_result)
`,{globals});checks.push({id:spec.id,label:spec.label,...JSON.parse(raw)});
    }catch(e){if(!check)throw e;checks.push({id:spec.id,label:spec.label,passed:false,actual:String(e.message||e).slice(-2000),expected:spec.expectError||JSON.stringify(spec.expected)});}
    finally{globals.destroy();}
   }
  }else{
   if(typeof projectSeed!=='string'||projectSeed.length>32000)throw Error('Project schema is unavailable.');
   for(const spec of check?cases:[null]){
    const db=new SQL.Database();
    try{
     db.run(projectSeed);if(spec?.seedExtra)db.run(spec.seedExtra);const results=[];
     for(const statement of db.iterateStatements(code)){const columns=statement.getColumnNames(),values=[];let n=0;while(statement.step()){if(n++<200)values.push(statement.get());if(n>50000)throw Error('Result too large; narrow the query.');}if(columns.length)results.push({columns,values,truncated:n>200});}
     if(!spec){self.postMessage({id,results,output:results.length?'':'Statement executed. No result table returned.',passed:null});return;}
     let last=results.at(-1);
     if(spec.verifyQuery){const verified=db.exec(spec.verifyQuery);last=verified.at(-1);}
     const actual=last?{columns:last.columns,values:last.values}:null;
     checks.push({id:spec.id,label:spec.label,passed:JSON.stringify(actual)===JSON.stringify(spec.expected),actual:JSON.stringify(actual).slice(0,2000),expected:JSON.stringify(spec.expected).slice(0,2000)});
    }catch(e){if(!check)throw e;checks.push({id:spec.id,label:spec.label,passed:false,actual:String(e.message||e).slice(0,2000),expected:JSON.stringify(spec.expected)});}
    finally{db.close();}
   }
  }
  self.postMessage({id,output:output.join('\n')||(type==='python'?'(No printed output.)':'SQL checks completed. Inspect each result below.'),checks,passed:check?checks.length>0&&checks.every(c=>c.passed):null});
 }catch(e){self.postMessage({id,error:String(e.message||e).slice(0,3000)});}
}
