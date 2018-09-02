// routines for handling 4x4 matrices
// very few sanity checks
// the use of "var" might be suboptimal
// - todo: everywhere some type checking, args can be matrices or arrays
//
// - only the constructor (optionally,copy=true) creates elem, i.e.
// I make sure that none of these functions change the actual address of elem
// (so references will follow)

var msize=4;

var matrix_accuracy=1e-6;

//var matrix_zero=new Array(msize); for (var i=0; i<msize; i++) { matrix_zero[i]=new Array(msize); for (var j=0; j<msize; j++) matrix_zero[i][j]=0.; }
var matrix_identity=new Array(msize); for (var i=0; i<msize; i++) { matrix_identity[i]=new Array(msize); for (var j=0; j<msize; j++) if (i==j) matrix_identity[i][j]=1.; else matrix_identity[i][j]=0.; }

function doubleArrayToFloat32Array(mat) // used internally
{
    var val=new Float32Array(msize*msize);
    var i,j;
    for (i=0; i<msize; i++)
	for (j=0; j<msize; j++)
	    val[i+msize*j]=mat[i][j]; // note the transposition to conform to openGL's silly convention
    return val;
}

function Matrix(mat) // simple constructor
{
    if (typeof(mat)=='number') // a number means multiple of identity
    {	
	this.elem=doubleArrayToFloat32Array(matrix_identity);
	this.leftmultiply(mat);
    }
    else if (typeof(mat) == 'object')
    {
	if (mat instanceof Matrix)
	{
	    this.elem=new Float32Array(mat.elem);
	}
	if (mat instanceof Float32Array)
	{
	    this.elem=new Float32Array(mat);
	}
	else if (mat instanceof Array)
	{
	    this.elem=doubleArrayToFloat32Array(mat);
	}
    }
    else
	this.elem=new Float32Array(msize*msize);
} 
Matrix.prototype = 
{
    // Returns element (i,j) of the matrix
    e: function(i,j) { return this.elem[i+msize*j]; },

    zero: function() 
    {
	this.elem.fill(0);
    },

    // display
    print: function() 
    { 
	a="{"; 
	for (var i=0; i<msize; i++) 
	    {
		a+="{";
		for (var j=0; j<msize; j++)
		    {
			a+=this.e(i,j);
			if (j<msize-1) a+=",";
		    }
		a+="}";
		if (i<msize-1) a+=",";
	    }
	a+="}";
	return a;
    },

    // add another matrix or a scalar (multiple of identity)
    add: function(mat)
    {
	if (typeof(mat)=='number')
	    {
		for (var i=0; i<msize; i++)
		    this.elem[i*(msize+1)]+=mat;
	    }
	else if (typeof(mat)=='object')
	    {
		for (var i=0; i<msize*msize; i++)
		    this.elem[i]+=mat.elem[i];
	    }
    },

    // left multiply by a matrix or scalar
    leftmultiply: function(mat) 
    {
	if (typeof(mat)=='number')
	    {
		for (var i=0; i<msize*msize; i++)
		    this.elem[i]*=mat;
	    }
	else if (typeof(mat)=='object')
	    {
		var temp=new Float32Array(msize*msize);
		for (var i=0; i<msize; i++)
		    for (var j=0; j<msize; j++)
			for (var k=0; k<msize; k++)
			    temp[i+msize*k]+=mat.elem[i+msize*j]*this.elem[j+msize*k];
		this.elem=temp;
	    }
    },

    transpose: function()
    {
	var temp;
	for (i=0; i<msize-1; i++)
	    for (j=i+1; j<msize; j++)
		{
		    temp=this.elem[i+msize*j];
		    this.elem[i+msize*j]=this.elem[j+msize*i];
		    this.elem[j+msize*i]=temp;
		}
    },


    // orthogonalize
    orthogonalize: function()
    {
	var q=new Matrix();
	var qq;
	var eps=1.; var t=0;
	while ((eps>matrix_accuracy)&&(t<20)) // safeguard here: can't iterate more than ... times
	    {
		eps=0.;
		for (var i=0; i<msize; i++)
		    for (var j=0; j<msize; j++)
			{
			    qq=0;
			    for (var k=0; k<msize; k++) qq+=this.elem[i+msize*k]*this.elem[j+msize*k];
			    if (i==j) { eps+=Math.abs(qq-1); q.elem[i+msize*j]=1.5-0.5*qq; }
			    else { eps+=Math.abs(qq); q.elem[i+msize*j]=-0.5*qq; }
			}
		this.leftmultiply(q);
		t++;
	    } 
    },

    // random antisymmetric matrix
    randomanti: function(amp)
    {
	for (var i=0; i<msize; i++)
	    for (var j=0; j<msize; j++)
		if (i<j)
		    this.elem[i+msize*j]=amp*(Math.random()-0.5);
		else if (i>j)
		    this.elem[i+msize*j]=-this.elem[j+msize*i];
		else
		    this.elem[i*(msize+1)]=0;
    },

    //generates a random orthogonal
    //matrix in the neighborhood of the origin
    randomorthog: function(amp)
    {
	this.randomanti(amp);
	this.add(1);
	this.orthogonalize();
    },

    // below = 4d only!
    rotate: function(r,rr) // find a 3d rotation that sends r -> rr (r,rr close, on unit sphere)
    {
	var v=[r[1]*rr[2]-r[2]*rr[1],r[2]*rr[0]-r[0]*rr[2],r[0]*rr[1]-r[1]*rr[0]]; // vector product
	var s=v[0]*v[0]+v[1]*v[1]+v[2]*v[2]; // its square norm
	// produce the rotation matrix: use (1+x^y/2)/(1-x^y/2) !!!
	var mm=new Matrix(matrix_identity);
	for (var i=0; i<3; i++)
	    for (var j=0; j<3; j++)
		{
		    if (i==j)
			mm.elem[i+msize*j]=1+0.5*v[i]*v[i]-0.25*s;
		    else
			{
			    mm.elem[i+msize*j]=0.5*v[i]*v[j];
			    if ((i+1)%3==j)
				mm.elem[i+msize*j]-=v[(i+2)%3];
			    else
				mm.elem[i+msize*j]+=v[(i+1)%3];
			}
		    mm.elem[i+msize*j]/=1+0.25*s;
		}
	// multiply current matrix with new matrix
	this.leftmultiply(mm);
    },

    coeff1: function() // - trace
    {
	return -this.elem[0] - this.elem[5] - this.elem[10] - this.elem[15]; 
    },

    coeff2: function() // next coeff in charact poly
    {
	return -this.elem[1]*this.elem[4] + this.elem[0]*this.elem[5] - this.elem[2]*this.elem[8] - this.elem[6]*this.elem[9] + this.elem[0]*this.elem[10] + this.elem[5]*this.elem[10] - this.elem[3]*this.elem[12] - this.elem[7]*this.elem[13] - this.elem[11]*this.elem[14] + this.elem[0]*this.elem[15] + this.elem[5]*this.elem[15] + this.elem[10]*this.elem[15]; 
    },

    sqrootorthog: function() // turns orthogonal matrix into its square root
    {
	var r=this.coeff1();
	if (r>4-matrix_accuracy) // very rare and special case: the full rotation diag(-1,-1,-1,-1)
	    {		
		for (var i=0; i<4; i++)
		    for (var j=0; j<4; j++)
			if ((i^1)!=j) this.elem[i+4*j]=0;
			else if (i<j)
			    this.elem[i+4*j]=1.;
			else
			    this.elem[i+4*j]=-1.;
		return;
	    }
	var s=this.coeff2();
  
	// first choice of sign
	var d1=2-2*r+s; // d1 = (1+cos)(1+cos')>=0

	while (d1<matrix_accuracy)
	    {
		// we're in trouble: one eigenvalue is -1.
		// find the projection matrix onto -1 eigenspace
		var q=new Matrix(this);
		q.transpose(); q.add(this);
		for (i=0; i<4; i++) q.elem[5*i]+=r-2;
		var rm=new Matrix(); rm.randomanti(Math.sqrt(matrix_accuracy));
		rm.leftmultiply(q); q.leftmultiply(rm);
		this.add(q); this.orthogonalize();
		r=this.coeff1(); s=this.coeff2(); d1=2-2*r+s;
	    }
	
	var t=(Math.sqrt(d1)-1)/(1-2*r+s);
	// second choice of sign
	var d2=2 - r - 2*r*t + 2*s*t + 2*t*t - r*t*t;      
	var a=new Array(4);
	a[0]=1/Math.sqrt(d2);
	a[3]=t*a[0];
	a[2]=a[3]*(r-1);
	a[1]=a[0]+a[3]*(s-r);

	// now we can create sqroot
	var p=new Matrix(this);
	for (var i=3; i>=0; i--)
	    {
		if (i==3)
		    this.zero();
		else
		    this.leftmultiply(p);
		this.add(a[i]);
	    }	
    },

    computerotation: function(m1,m2,nsteps) // find a matrix that
    // goes from m1 to m2 in nsteps steps (orthogonal matrices)
    {
	var i,j;
	
	for (i=0; i<4; i++)
	    for (j=0; j<4; j++)
		this.elem[i+4*j]=m1.elem[j+4*i]; // transpose = inverse
	this.leftmultiply(m2);
	// now this contains m2.m1^{-1}
	
	i=1.0001;
	while (i<nsteps) { this.sqrootorthog(); i*=2; } 
    },
};
