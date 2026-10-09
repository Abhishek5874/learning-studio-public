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
