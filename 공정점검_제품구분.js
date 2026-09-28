function getPeriodProduct(p){return values.periodProducts?.[p]||''}
function getJournalProduct(){return getPeriodProduct('오전')||getPeriodProduct('오후')||''}
function setupPeriodProducts(){
 $('product').addEventListener('input',()=>{if(!values.periodProducts)values.periodProducts={오전:'',오후:''};values.periodProducts[period]=$('product').value});
 const previousRender=render;render=function(){const input=$('product');input.value=getPeriodProduct(period);const label=$('productLabel');if(label)label.textContent=period+' 배합코드 · 제품명';previousRender()};render();
}
