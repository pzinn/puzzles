var xmax0=10,ymax0=6;
var boxsize0=20; // default size of each box in pixels
var border0=5; // # pixels on boundary

var occupiedselect="rgb(155,155,155)",
    occupied="rgb(255,255,255)", // seems impossible to "fill" with transparent, despite all my attempts with globalCompositeOperation (serious implementation issues, apparently. the obvious guess, "copy", actually works on the whole canvas, would require clipping...). so I use clearRect instead
    occupieddisabled="rgb(200,200,200)",
    emptyselect="rgb(100,100,100)",
    empty="rgb(0,0,0)";

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
    div.style.position="relative"; //!!!! essential

    // dynamic canvas
    var canvas = document.createElement('canvas');
    canvas.id=name+"canvas";
    canvas.style.position="absolute";
    canvas.style.top=0;
    canvas.style.left=0;

    // static canvas
    var canvas2 = document.createElement('canvas');  
    canvas2.id=name+"canvas2";

    // the text input
    var src;
    if (source)
    {
	src=document.createElement('input');
	src.type="text"; // seems to be text by default
	src.id=name+"src";
	if (!enabled) src.disabled=true; // careful that "true" here is meaningless -- even "false" would turn disabled on
    }

    canvas.enabled=enabled;

    if (canvas.getContext)
    {
 	var ctx = canvas.getContext('2d');
	var cx,cy;
	cx = boxsize*xmax+2*border;
	cy = boxsize*ymax+2*border; 
	canvas.width=cx;
	canvas.height=cy;
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
	return {x: event.clientX-rect.left,
		y: event.clientY-rect.top};
    }


    canvas.drawselected=function(x,y,xx,yy) // xx,yy=mouse position for gradient effect
    {
	var yo;
	var t=young.testbox(x,y);
	if (t==0)
	    document.body.style.cursor="default";
	else
	{
	    document.body.style.cursor="crosshair";
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
	    ctx.fillRect(border+x*boxsize,border+y*boxsize,boxsize,boxsize);
	}
	else if (t==-1)
	{
//	    ctx.clearRect(border+x*boxsize,border+y*boxsize,boxsize,boxsize); // not fill with occupied <--- WHY NOT?
	    if (this.enabled) ctx.fillStyle=occupied; else ctx.fillStyle=occupieddisabled;
	    ctx.fillRect(border+x*boxsize,border+y*boxsize,boxsize,boxsize); // test
	}
    }

    canvas.onclick=function(event)
    {
	if (!this.enabled) return false;
	if (event.which==1) // left click
	{
	    var pos=this.getMousePos(event);
	    var x = Math.floor((pos.x-border)/boxsize);
	    var y = Math.floor((pos.y-border)/boxsize);
//	    var x = Math.floor((event.pageX - this.offsetLeft-border)/boxsize);
	    //	    var y = Math.floor((event.pageY - this.offsetTop-border)/boxsize);
	    young.togglebox(x,y);
	    if (source) src.value=young.get();
	    this.drawnormal(x,y); // necessary because of this annoying transparency thing..
	    this.drawselected(x,y,pos.x,pos.y);
	    return false; // prevent default behavior -- not that we care so much since cursor style moved to onmousemove
	}
    }

    var oldx=-1, oldy=-1;
    canvas.onmousemove=function(event) // we could use document.onmousemove instead, would be simpler but wouldn't be local
    {
	if (!this.enabled) return false;
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
	if (!this.enabled) return false;
	this.drawnormal(oldx,oldy);
	oldx=oldy=-1;
    }

    canvas.redraw=function()
    {
	// redraw all
	ctx.fillStyle=empty;
	ctx.fillRect(0,0,this.width,this.height);
	if (this.enabled) ctx.fillStyle=occupied; else ctx.fillStyle=occupieddisabled;
	for (var i=0; i<young.length; i++)
	    //	    ctx.clearRect(border,border+i*boxsize,boxsize*young[i],boxsize);
	    ctx.fillRect(border,border+i*boxsize,boxsize*young[i],boxsize);
    }

    young.set=function(p0) // redefined because need to redraw
    {
	var flag=partition.prototype.set.call(this,p0); // inheritance
	if (source) src.value=this.get();
	if (flag)
	    canvas.redraw();
	else
	    alert("Please make sure you type the partition as a nonincreasing sequence of integers, and that 'Sizes' are large enough.");
	return flag;
    }
 
    //fixed background canvas (grid)
    if (canvas2.getContext)
    {
 	var ctx2 = canvas2.getContext('2d');  
	canvas2.width=cx;
	canvas2.height=cy;
	ctx2.fillStyle="white";
	ctx2.fillRect(0,0,cx,cy);
	ctx2.strokeStyle="black";
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
    }

    // now insert them
/*
    div.appendChild(canvas2);
    div.appendChild(canvas);
    div.appendChild(document.createElement('br'));
*/
    // in case there's some junk already
//    div.insertBefore(document.createElement('br'),div.firstChild);
//    if (complement) document.getElementById('debug').appendChild(comp);
    div.insertBefore(canvas,div.firstChild);
    div.insertBefore(canvas2,div.firstChild);
    if (source) div.appendChild(src);

    if (enabled) div.style.color=""; else div.style.color="gray";
    
    return young;
}

function destroyyoung(name)
{
    var div=document.getElementById(name);
    div.removeChild(document.getElementById(name+"canvas"));
    div.removeChild(document.getElementById(name+"canvas2"));
    var src=document.getElementById(name+"src");
    if (src!==null)
	div.removeChild(src);
}

