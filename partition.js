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
	    if ((typeof(p0)=='object')&&(p0.constructor==Array)&&(p0.length<=this.ymax))
	    {
		for (var i=0; i<p0.length; i++)
		{
		    p0[i]=Math.round(+p0[i]); // turn into numbers
		    if (isNaN(p0[i]) || (i==0 && p0[i]<0) || p0[i]>p0[i-1] || p0[i]>this.xmax) return false;
		}
		// remove the trailing zeroes
		while (p0.length>0 && p0[p0.length-1]==0) p0.pop();
		for (var i=0; i<p0.length; i++)
		    this[i]=p0[i];
		this.length=p0.length;
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
	constructor: partition
    }	
function partition(p0,xmax,ymax) // too complicated to make partition a descendent of Array. just pseudo-inherit a couple of functions
{
    if (typeof(xmax)=='undefined') this.xmax=xmax0; else this.xmax=xmax;
    if (typeof(ymax)=='undefined') this.ymax=ymax0; else this.ymax=ymax;
    if (!(this.set(p0))) this.length=0;
}

////

