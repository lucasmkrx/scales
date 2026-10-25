"""Add a vector publisher footer while preserving source pages and navigation.

Install PyMuPDF (pip install -r scripts/requirements.txt), then:
python scripts/brand-guides.py --source /path/to/original-guides
"""
import argparse,json
from pathlib import Path
import fitz

ROOT=Path(__file__).resolve().parents[1]
FILES={
 'Guitarra_Do_Sustenido_Notas_Escalas_e_Improvisacao.pdf':'guitar-c-sharp-right-pt.pdf',
 'Baixo_Drop_C_Notas_Escalas_e_Improvisacao.pdf':'bass-drop-c-right-pt.pdf',
 'Guitar_Standard_Tuning_Left_Handed_Notes_Scales_and_Improvisation.pdf':'guitar-standard-left-en.pdf',
 'Bass_Standard_Tuning_Left_Handed_Notes_Scales_and_Improvisation.pdf':'bass-standard-left-en.pdf',
}
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',type=Path,required=True);args=parser.parse_args()
 svg=fitz.open(ROOT/'public/assets/marques-and-co.svg');logo=fitz.open(stream=svg.convert_to_pdf(),filetype='pdf');outdir=ROOT/'public/guides';outdir.mkdir(exist_ok=True);report=[]
 for src,target in FILES.items():
  source=fitz.open(args.source/src);out=fitz.open();transforms=[]
  for old in source:
   w,h=old.rect.width,old.rect.height;page=out.new_page(width=w,height=h);page.draw_rect(page.rect,fill=(.985,.99,.995),color=None)
   page.show_pdf_page(fitz.Rect(0,0,w,h-18),source,old.number,keep_proportion=True)
   scale=(h-18)/h;tx=(w-w*scale)/2;matrix=fitz.Matrix(scale,0,0,scale,tx,0);transforms.append(matrix)
   page.show_pdf_page(fitz.Rect(w/2-42,h-16,w/2+42,h-16+84*.14087),logo,0)
   page.insert_text((30,h-7),'Scales / Lucas Marques / CC BY 4.0',fontsize=5.5,color=(.27,.34,.40))
  for old in source:
   for item in old.get_links():
    link={k:v for k,v in item.items() if k not in ['xref','id']};link['from']=link['from']*transforms[old.number]
    # The original application's ReportLab links expose a one-based numeric
    # destination as LINK_NAMED; normalize them to explicit internal links.
    if link['kind']==fitz.LINK_NAMED and str(link.get('page','')).isdigit():
     link={'kind':fitz.LINK_GOTO,'from':link['from'],'page':int(link['page'])-1,'to':fitz.Point(0,0)}
    if link['kind']==fitz.LINK_GOTO and link.get('page',-1)>=0 and link.get('to') is not None:link['to']=link['to']*transforms[link['page']]
    out[old.number].insert_link(link)
  out.set_toc(source.get_toc());metadata=source.metadata;metadata['author']='Lucas Marques';metadata['keywords']=(metadata.get('keywords') or '')+', Scales, CC BY 4.0, Marques & Co.';out.set_metadata(metadata)
  lang=source.xref_get_key(source.pdf_catalog(),'Lang');out.xref_set_key(out.pdf_catalog(),'Lang',f'({lang[1] if lang[0]=="string" else "en-US"})')
  out.save(outdir/target,garbage=4,deflate=True);check=fitz.open(outdir/target)
  assert len(check)==len(source) and check.get_toc()==source.get_toc()
  for i,p in enumerate(check):
   assert len(p.get_links())==len(source[i].get_links()),(target,i+1)
   assert 'CC BY 4.0' in p.get_text()
   logos=[z for z in p.get_drawings() if 80<z['rect'].width<85 and 10<z['rect'].height<13 and z['rect'].y0>575]
   assert logos,(target,i+1,'Missing vector logo')
  report.append({'file':target,'pages':len(check),'vector_logo_on_every_page':True,'links_and_bookmarks_preserved':True})
  if (ROOT/'work/qa').exists():
   for n in [0,4,len(check)-1]:check[n].get_pixmap(matrix=fitz.Matrix(1.2,1.2)).save(ROOT/f'work/qa/branded-{target}-{n+1}.png')
  print(report[-1])
 (ROOT/'work/qa/guide-branding.json').write_text(json.dumps(report,indent=2))
if __name__=='__main__':main()
