"""Contact sheet: python3 tools/sheet.py OUT.jpg COLS LABEL_FONT_PX img1 img2 ...  (labels = file stem)"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
out, cols, fs = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); files=sys.argv[4:]
FONT='/srv/dt/shared/fonts/NotoSansSC.otf'; font=ImageFont.truetype(FONT,fs)
ims=[Image.open(f).convert('RGB') for f in files]
W=max(i.width for i in ims); H=max(i.height for i in ims); pad=24; lab=fs+16
rows=(len(ims)+cols-1)//cols
sheet=Image.new('RGB',(cols*(W+pad)+pad, rows*(H+lab+pad)+pad),'#F5F7F6'); d=ImageDraw.Draw(sheet)
for k,(im,f) in enumerate(zip(ims,files)):
    r,c=divmod(k,cols); x=pad+c*(W+pad); y=pad+r*(H+lab+pad)
    d.text((x,y),os.path.splitext(os.path.basename(f))[0],fill='#1F2A24',font=font)
    sheet.paste(im,(x,y+lab))
sheet.save(out,quality=82); print(out, sheet.size)
