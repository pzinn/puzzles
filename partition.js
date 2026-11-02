var xmax0=100,ymax0=100;

partition.prototype =
    {
	testbox: function(x,y) // can a box be added/removed
	{
	    if ((x<0)||(y<0)||(x>=this.xmax)||(y>=this.ymax)) return 0;  // to avoid nasty bugs
	    else if ((((y==this.length)&&(x==0))||(x==this[y]))&&((y==0)||(x<this[y-1])))
		return +1;
	    else if ((y<this.length)&&(this[y]==x+1)&&((y==this.length-1)||(this[y+1]<=x))) return -1;
	    else return 0;
	},
	togglebox: function(x,y)
	{
	    var t=this.testbox(x,y);
	    if (t==1)
	    {
		if (y==this.length) { this[y]=1; this.length++; } else this[y]++; // need to manually fix length since not descendant of Array
	    }
	    else if (t==-1)
	    {
		this[y]--;
		// remove the trailing zeroes
		if ((y==this.length-1)&&(this[y]==0)) this.length--;
	    }
	    return t;
	},
	set: function(p0)
	{
	    if (Array.isArray(p0)&&(p0.length<=this.ymax))
	    {
		var p=[];
		for (var i=0; i<p0.length; i++)
		{
		    var value=+p0[i];
		    if (!Number.isInteger(value) || value<0 || value>this.xmax || (i>0 && value>p[i-1])) return false;
		    p.push(value);
		}
		// remove the trailing zeroes
		while (p.length>0 && p[p.length-1]==0) p.pop();
		for (var i=0; i<p.length; i++)
		    this[i]=p[i];
		this.length=p.length;
		return true;
	    }
	    return false;
	},
	get: function()
	{
	    return Array.prototype.slice.call(this);//pseudo-inheritance. produces an array as a copy
	},
	get_padded: function()
	{
	    var l=this.get();
	    while (l.length<this.ymax) l.push(0);
	    return l;
	},
	complement: function()
	{
	    var l=this.get_padded();
	    var ll=[];
	    var i;
	    for (i=0; (i<this.ymax) && (l[this.ymax-1-i]<this.xmax); i++)
		ll[i]=this.xmax-l[this.ymax-1-i];
	    //	    ll.length=i;
	    return new partition(ll,this.xmax,this.ymax);
	},
	frombinarystring: function(s)
	{
	    var i=0;
	    var a=[];
	    var c1=0; var c0=0;
	    for (var i=0; i<s.length; i++) {
		if (s[i]=="1") c1++; else if (s[i]=="0") {
		    c0++;
		    a.unshift(c1);
		}
		else {
		    // TODO: error?
		}
	    }
	    /*
	    while (c1<this.xmax) { s=s+"1"; c1++; } // probably not needed -- need auto update anyway
	    while (c0<this.ymax) { s="0"+s; c0++; }
	    */
	    this.set(a);
	},
	tobinarystring: function()
	{
	    var p=this.get_padded();
	    var s=Array(this.xmax+this.ymax).fill("1");
	    for (var i=0; i<p.length; i++) s[p[i]+p.length-1-i]="0";
	    return s.join("");
	},
	constructor: partition
    }	
function partition(p0,xmax,ymax) // too complicated to make partition a descendent of Array. just pseudo-inherit a couple of functions
{
    if (typeof(xmax)=='undefined') this.xmax=xmax0; else this.xmax=+xmax;
    if (typeof(ymax)=='undefined') this.ymax=ymax0; else this.ymax=+ymax;
    if (!(this.set(p0))) this.length=0;
}

////

