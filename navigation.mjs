export class PageHistory {
 constructor(){this.current={page:'home',category:null};this.stack=[];}
 visit(page,category=null,state={}){
  if(page===this.current.page&&category===this.current.category)return;
  if(page==='home')this.stack=[];
  else this.stack.push({...this.current,...state});
  this.current={page,category};
 }
 back(){const previous=this.stack.pop();if(!previous)return null;this.current={page:previous.page,category:previous.category};return previous;}
}
