var xmax0=10,ymax0=6;
var boxsize0=20; // default size of each box in pixels
var border0=5; // # pixels on boundary

var occupiedselect='#527ba4', occupied='#304f74', occupieddisabled='#8b9caf',
    emptyselect='#dce7f3', empty='#f4f6f9';

// all the data are stored in the dynamic canvas (the one on top)
// a bit of a hack, one should probably define a class etc
// would be nice to have an option to allow resizing

function inityoung(name,ymax,xmax,boxsize,border,enabled,source)
{
    if (typeof(xmax)=='undefined') xmax=xmax0;
    if (typeof(ymax)=='undefined') ymax=ymax0;
    if (typeof(boxsize)=='undefined') boxsize=boxsize0;
    if (typeof(border)=='undefined') border=border0;
    if (typeof(enabled)=='undefined') enabled=true; // by default, enabled at the start
    if (typeof(source)=='undefined') source=true; // by default, have a text field

    var div=document.getElementById(name);
    var partitionName=['lambda','mu','nu','rho'][+name.slice(1)-1] || name;
    var diagram=document.getElementById(name+'diagram') || div;
    diagram.style.position='relative';
    var ratio=Math.min(window.devicePixelRatio || 1,2);

    // dynamic canvas
    var canvas = document.createElement('canvas');
    canvas.id=name+"canvas";
    canvas.style.position="absolute";
    canvas.style.top=0;
    canvas.style.left=0;
    canvas.style.width='100%';
    canvas.style.height='100%';
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label','Partition diagram; edit boxes with a pointer or use the row input.');

    // static canvas
    var canvas2 = document.createElement('canvas');  
    canvas2.id=name+"canvas2";
    canvas2.style.width='100%';
    canvas2.style.height='auto';
    canvas2.setAttribute('aria-hidden','true');

    // the text input
    var src,src2;
    if (source)
    {
	src=document.createElement('input');
	src.type="text"; // seems to be text by default
	src.id=name+"src";
	src.setAttribute('aria-label','Rows of partition '+partitionName);
	src.autocomplete='off';
	if (!enabled) src.disabled=true; // careful that "true" here is meaningless -- even "false" would turn disabled on
	src2=document.createElement('input');
	src2.type="text"; // seems to be text by default
	src2.id=name+"src2";
	src2.setAttribute('aria-label','Binary notation of partition '+partitionName);
	src2.autocomplete='off';
	if (!enabled) src2.disabled=true; // careful that "true" here is meaningless -- even "false" would turn disabled on
    }

    canvas.enabled=enabled;
    canvas.canEdit=function() {
	var settings=document.getElementById('calculation-settings');
	return this.enabled && !(settings && settings.disabled);
    };

    if (canvas.getContext)
    {
 	var ctx = canvas.getContext('2d');
	var cx,cy;
	cx = boxsize*xmax+2*border;
	cy = boxsize*ymax+2*border; 
	canvas.width=Math.round(cx*ratio);
	canvas.height=Math.round(cy*ratio);
	diagram.style.width=cx+'px';
	ctx.scale(ratio,ratio);
	ctx.fillStyle=empty;
	ctx.fillRect(0,0,cx,cy);
    }
    else alert("Could not find canvas");

    var young=new partition([],xmax,ymax); // the partition
    // a more conventional choice would've been to define young as a property of say canvas:
    // canvas.young = ...
    // we'll do it too anyway
    div.young=young;

    canvas.getMousePos=function(event) // most reliable I've found so far...
    {
	var rect=this.getBoundingClientRect();
	return {x:(event.clientX-rect.left)*cx/(rect.width || cx),
		y:(event.clientY-rect.top)*cy/(rect.height || cy)};
    }


    canvas.drawselected=function(x,y,xx,yy) // xx,yy=mouse position for gradient effect
    {
	var yo;
	var t=young.testbox(x,y);
	if (t==0)
	    this.style.cursor="default";
	else
	{
	    this.style.cursor="crosshair";
	    var grad=ctx.createRadialGradient(xx,yy,0,xx,yy,boxsize);//!
	    if (t==-1) 
	    {
		grad.addColorStop(0,occupiedselect);
		grad.addColorStop(1,occupied);
	    }
	    else 
	    {	    
		grad.addColorStop(0,emptyselect);
		grad.addColorStop(1,empty);
	    }
	    ctx.fillStyle=grad;
	    ctx.fillRect(border+1+x*boxsize,border+1+y*boxsize,boxsize-2,boxsize-2);
	}
    }

    canvas.drawnormal=function(x,y)
    {
	var t=young.testbox(x,y);
	if (t==1)
	{
	    ctx.fillStyle=empty;
	    ctx.fillRect(border+1+x*boxsize,border+1+y*boxsize,boxsize-2,boxsize-2);
	}
	else if (t==-1)
	{
//	    ctx.clearRect(border+x*boxsize,border+y*boxsize,boxsize,boxsize); // not fill with occupied <--- WHY NOT?
	    if (this.enabled) ctx.fillStyle=occupied; else ctx.fillStyle=occupieddisabled;
	    ctx.fillRect(border+1+x*boxsize,border+1+y*boxsize,boxsize-2,boxsize-2);
	}
    }

    canvas.onclick=function(event)
    {
        if (!this.canEdit()) return false;
	if (event.button===0 || event.which===1)
	{
	    var pos=this.getMousePos(event);
	    var x = Math.floor((pos.x-border)/boxsize);
	    var y = Math.floor((pos.y-border)/boxsize);
//	    var x = Math.floor((event.pageX - this.offsetLeft-border)/boxsize);
	    //	    var y = Math.floor((event.pageY - this.offsetTop-border)/boxsize);
	    young.togglebox(x,y);
	    if (source) { src.value=young.get(); src2.value=young.tobinarystring(); }
	    this.redraw();
	    this.drawselected(x,y,pos.x,pos.y);
	    return false; // prevent default behavior -- not that we care so much since cursor style moved to onmousemove
	}
    }

    var oldx=-1, oldy=-1;
    canvas.onmousemove=function(event) // we could use document.onmousemove instead, would be simpler but wouldn't be local
    {
	if (!this.canEdit()) return false;
//	var x = Math.floor((event.pageX - this.offsetLeft-border)/boxsize);
//	var y = Math.floor((event.pageY - this.offsetTop-border)/boxsize);
	var pos=this.getMousePos(event);
	var x = Math.floor((pos.x-border)/boxsize);
	var y = Math.floor((pos.y-border)/boxsize);
	
	this.drawnormal(oldx,oldy);
	
	this.drawselected(x,y,pos.x,pos.y);
	
	oldx=x; oldy=y;
    }

    canvas.onmouseout=function(event) // instead we use mouseout, which is much cleaner
    {
	if (!this.canEdit()) { this.style.cursor='default'; return false; }
	this.drawnormal(oldx,oldy);
	oldx=oldy=-1;
    }

    canvas.redraw=function()
    {
	// redraw all
	ctx.fillStyle=empty;
	ctx.clearRect(0,0,cx,cy);
	if (this.enabled) ctx.fillStyle=occupied; else ctx.fillStyle=occupieddisabled;
	for (var i=0; i<young.length; i++)
	    for (var j=0; j<young[i]; j++)
		ctx.fillRect(border+1+j*boxsize,border+1+i*boxsize,boxsize-2,boxsize-2);
    }

    young.set=function(p0) // redefined because need to redraw
    {
	var flag=partition.prototype.set.call(this,p0); // inheritance
	if (source) { src.value=this.get(); src2.value=this.tobinarystring(); }
	if (flag) {
	    reportInputError('');
	    canvas.redraw();
	} else
	    reportInputError("Enter nonincreasing, nonnegative integer rows that fit the bounding box.");
	return flag;
    }
 
    //fixed background canvas (grid)
    if (canvas2.getContext)
    {
 	var ctx2 = canvas2.getContext('2d');  
	canvas2.width=Math.round(cx*ratio);
	canvas2.height=Math.round(cy*ratio);
	ctx2.scale(ratio,ratio);
	ctx2.fillStyle=empty;
	ctx2.fillRect(0,0,cx,cy);
	ctx2.strokeStyle='#c3cfdb';
	ctx2.lineWidth=1;
	for (var x=0;x<=xmax;x++)
	{
	    ctx2.beginPath();
	    ctx2.moveTo(border+x*boxsize,0);
	    ctx2.lineTo(border+x*boxsize,cy);
	    ctx2.stroke();
	}
	for (var y=0;y<=ymax;y++)
	{
	    ctx2.beginPath();
	    ctx2.moveTo(0,border+y*boxsize);
	    ctx2.lineTo(cx,border+y*boxsize);
	    ctx2.stroke();
	}
    }
    else alert("Could not find canvas");

    if (source)
    {
	src.value="";
	src.onchange=function() // change to user text input only
	{
	    young.set(this.value.split(",")); // partition does everything
	}
	src2.value=young.tobinarystring();
	src2.onchange=function() // change to user text input only
	{
	    // convert binary string to partition which is silly cause gonna get reconverted
	    young.frombinarystring(this.value);
	}
    }

    diagram.appendChild(canvas2);
    diagram.appendChild(canvas);
    if (source) {
	(document.getElementById(name+'rows') || div).appendChild(src);
	(document.getElementById(name+'binary') || div).appendChild(src2);
    }
    div.classList.toggle('is-disabled',!enabled);
    canvas.redraw();
    
    return young;
}

function destroyyoung(name)
{
    for (var suffix of ['canvas','canvas2','src','src2']) {
	var element=document.getElementById(name+suffix);
	if (element && element.parentElement) element.parentElement.removeChild(element);
    }
}

