const fs=require('fs');
const path=require('path');
const dir=path.join(__dirname,'..','templates');
console.log('Processing templates in',dir);
fs.readdirSync(dir).filter(f=>f.endsWith('.html')).forEach(f=>{
  const p=path.join(dir,f);
  let c=fs.readFileSync(p,'utf8');
  const updated=c.replace(/<a href="details/g,'<a data-i18n="learn_more" href="details');
  if(updated!==c){
    fs.writeFileSync(p,updated,'utf8');
    console.log('Updated',f);
  }
});
